const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario'); // Necesario para crearPartida
const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// Variables en memoria para gestionar los timers
const temporizadoresPartidas = {};

// -------------------------------------------------------------------------
// 1. CREAR PARTIDA (Profesor)
// -------------------------------------------------------------------------
exports.crearPartida = async (req, res) => {
    const { idCuestionario, idProfesor, modoAcceso } = req.body;

    try {
        const cuestionarioPadre = await Cuestionario.findById(idCuestionario);
        if (!cuestionarioPadre) {
            return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado.' });
        }

        // Mapping de tipos
        let modoPartida = tipos.MODOS_JUEGO.EN_VIVO
        if (cuestionarioPadre.tipoCuestionario === 'examen') {
            modoPartida = tipos.MODOS_JUEGO.EXAMEN
        }

        const nuevaPartida = new Partida({
            idCuestionario,
            idProfesor,
            pin: generarPinUnico(),
            modo: modoPartida,
            modoAcceso: modoAcceso || tipos.TIPO_LOBBY.PUBLICA,
            configuracion: {
                tiempoPorPreguntaSeg: cuestionarioPadre.tiempoPorPreguntaSeg,
                modoCalificacion: cuestionarioPadre.modoCalificacion,
                mostrarRanking: cuestionarioPadre.mostrarRanking,
                tiempoTotalMin: cuestionarioPadre.programacion?.tiempoTotalMin || 60
            },
            estadoPartida: tipos.ESTADOS_PARTIDA.ESPERA
        });

        await nuevaPartida.save();

        res.status(201).json({
            ok: true,
            mensaje: 'Partida creada lista para iniciar',
            data: {
                id: nuevaPartida._id,
                pin: nuevaPartida.pin,
                modo: nuevaPartida.modo
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 2. UNIRSE A PARTIDA (Alumno) -> Solo añade al array de Partida
// -------------------------------------------------------------------------
exports.unirseAPartida = async (req, res) => {
    const { pin } = req.params;
    const { idAlumno, nombreAlumno } = req.body;

    try {
        const partida = await Partida.findOne({ pin, estadoPartida: { $ne: tipos.ESTADOS_PARTIDA.FINALIZADA } });

        if (!partida) {
            return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada o ' + tipos.ESTADOS_PARTIDA.FINALIZADA });
        }

        const jugadorExiste = partida.jugadores.some(j => j.idAlumno === idAlumno);

        if (jugadorExiste) {
            return res.json({
                ok: true,
                mensaje: 'Ya estabas unido a la partida.',
                data: { idPartida: partida._id, modo: partida.modo }
            });
        }

        partida.jugadores.push({
            idAlumno,
            nombreAlumno,
            puntuacionTotal: 0,
            aciertos: 0,
            fallos: 0,
            estado: tipos.ESTADO_USER.ACTIVO
        });

        partida.numParticipantes = partida.jugadores.length;
        await partida.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(pin).emit('nuevo_jugador', {
                nombre: nombreAlumno,
                total: partida.numParticipantes
            });
        }

        res.json({
            ok: true,
            mensaje: 'Unido correctamente',
            data: {
                idPartida: partida._id,
                modo: partida.modo,
                configuracion: partida.configuracion
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 3. INICIAR PARTIDA (Profesor)
// -------------------------------------------------------------------------
exports.iniciarPartida = async (req, res) => {
    const { id } = req.params;
    const io = req.app.get('socketio');

    try {
        const partida = await Partida.findById(id);
        if (!partida) return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });

        partida.estadoPartida = tipos.ESTADOS_PARTIDA.ACTIVA;
        partida.inicioEn = Date.now();
        partida.stats = { respuestasTotales: 0, aciertosGlobales: 0, fallosGlobales: 0 };

        await partida.save();

        // MODO EXAMEN
        if (partida.modo === tipos.MODOS_JUEGO.EXAMEN) {
            if (io) {
                io.to(partida.pin).emit('inicio_examen', {
                    mensaje: 'El examen ha comenzado.',
                    finExamen: new Date(Date.now() + (partida.configuracion.tiempoTotalMin * 60000))
                });
            }
            return res.json({ ok: true, mensaje: 'Examen iniciado.' });
        }

        // MODO EN VIVO
        else if (partida.modo === tipos.MODOS_JUEGO.EN_VIVO) {
            partida.preguntaActual = 0;
            await partida.save();

            // Iniciar ciclo automático
            gestionarCicloPregunta(partida, 0, io);

            return res.json({ ok: true, mensaje: 'Partida en vivo iniciada.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 4. RESPONDER PREGUNTA (Alumno) -> Actualiza Partida + Participacion
// -------------------------------------------------------------------------
exports.enviarRespuesta = async (req, res) => {
    const { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado } = req.body;
    const io = req.app.get('socketio');

    try {
        const partida = await Partida.findById(idPartida);
        if (!partida) return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });

        const preguntaDoc = await Pregunta.findById(idPregunta);
        if (!preguntaDoc) return res.status(404).json({ ok: false, mensaje: 'Pregunta inválida' });

        // A. Corrección
        let esCorrecta = true;
        const indicesCorrectos = preguntaDoc.opciones
            .map((op, i) => op.esCorrecta ? i : -1)
            .filter(i => i !== -1).sort();
        const marcadasSorted = opcionesMarcadas.sort();

        if (JSON.stringify(indicesCorrectos) !== JSON.stringify(marcadasSorted)) {
            esCorrecta = false;
        }

        let puntosGanados = 0;
        if (esCorrecta) {
            if (partida.modo === tipos.MODOS_JUEGO.EN_VIVO) {
                const ratio = 1 - (tiempoEmpleado / (preguntaDoc.tiempoLimiteSeg || 20)) / 2;
                puntosGanados = Math.ceil(preguntaDoc.puntuacionMax * ratio);
            } else {
                puntosGanados = preguntaDoc.puntuacionMax;
            }
        }

        // B. Actualizar Partida (Ranking Vivo)
        const jugadorIndex = partida.jugadores.findIndex(j => j.idAlumno === idAlumno);
        if (jugadorIndex !== -1) {
            partida.jugadores[jugadorIndex].puntuacionTotal += puntosGanados;
            if (esCorrecta) partida.jugadores[jugadorIndex].aciertos += 1;
            else partida.jugadores[jugadorIndex].fallos += 1;
            await partida.save();
        }

        // C. Guardar en Participaciones (Historial)
        const nuevaRespuesta = {
            idPregunta: preguntaDoc._id,
            opcionesMarcadas,
            esCorrecta,
            tiempoRespuestaSeg: tiempoEmpleado,
            puntosObtenidos: puntosGanados,
            respondidaEn: new Date()
        };

        await Participacion.findOneAndUpdate(
            { idPartida, idAlumno },
            {
                $set: { modo: partida.modo, estado: 'activa' },
                $push: { respuestas: nuevaRespuesta },
                $inc: {
                    puntuacionTotal: puntosGanados,
                    aciertos: esCorrecta ? 1 : 0,
                    fallos: esCorrecta ? 0 : 1
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (partida.modo === tipos.MODOS_JUEGO.EN_VIVO && io) {
            io.to(partida.pin).emit('actualizacion_respuestas', {
                respondidas: partida.stats?.respuestasTotales + 1 || 1
            });
        }

        res.json({ ok: true, data: { esCorrecta, puntosGanados } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 5. FINALIZAR PARTIDA (Profesor Manual)
// -------------------------------------------------------------------------
exports.finalizarPartida = async (req, res) => {
    const { id } = req.params;
    const io = req.app.get('socketio');

    try {
        const partida = await Partida.findByIdAndUpdate(id, {
            estadoPartida: tipos.ESTADOS_PARTIDA.FINALIZADA,
            finEn: Date.now()
        }, { new: true });

        if (!partida) return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });

        if (io) {
            io.to(partida.pin).emit('fin_partida', {
                mensaje: 'El profesor ha finalizado la partida',
                ranking: obtenerRanking(partida.jugadores)
            });
        }

        res.json({ ok: true, mensaje: 'Partida finalizada' });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 6. OBTENER PREGUNTAS (Modo Examen)
// -------------------------------------------------------------------------
exports.obtenerPreguntasExamen = async (req, res) => {
    const { idPartida } = req.params;
    try {
        const partida = await Partida.findById(idPartida);
        if (!partida || partida.modo !== tipos.MODOS_JUEGO.EXAMEN) {
            return res.status(400).json({ ok: false, mensaje: 'Acceso no permitido' });
        }
        const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
        const preguntasSanitizadas = preguntas.map(p => ({
            id: p._id, texto: p.textoPregunta, opciones: p.opciones, tipo: p.tipoPregunta
        }));
        res.json({ ok: true, data: preguntasSanitizadas });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 7. OBTENER PARTIDA POR PIN (Auxiliar necesaria para Router)
// -------------------------------------------------------------------------
exports.obtenerPartidaPorPin = async (req, res) => {
    const { pin } = req.params;
    try {
        const partida = await Partida.findOne({ pin, estadoPartida: { $ne: 'finalizada' } });
        if (!partida) return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });
        res.json({ ok: true, data: partida });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
// -------------------------------------------------------------------------
// 8. OBTENER TODAS LAS PARTIDAS (Con filtros)
// -------------------------------------------------------------------------
exports.obtenerTodasPartidas = async (req, res) => {
    try {
        const { idProfesor, estado, modo } = req.query;

        let filtro = {};

        // Filtro por profesor (Para ver "Mis Partidas")
        if (idProfesor) {
            filtro.idProfesor = idProfesor;
        }

        // Filtro por estado (ej: ?estado=finalizada para ver historial)
        if (estado) {
            filtro.estadoPartida = estado;
        }

        // Filtro por modo (en_vivo vs programada)
        if (modo) {
            filtro.modo = modo;
        }

        const partidas = await Partida.find(filtro)
            .populate('idCuestionario', 'titulo') // Traemos el título del quiz
            .sort({ inicioEn: -1 }); // Las más recientes primero

        res.json({
            ok: true,
            total: partidas.length,
            data: partidas
        });

    } catch (error) {
        console.error("Error al obtener partidas:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 9. OBTENER DETALLE DE UNA PARTIDA (Por ID)
// -------------------------------------------------------------------------
exports.obtenerDetallePartida = async (req, res) => {
    const { id } = req.params;

    try {
        const partida = await Partida.findById(id)
            .populate('idCuestionario', 'titulo descripcion');

        if (!partida) {
            return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada.' });
        }

        res.json({ ok: true, data: partida });

    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 10. ACTUALIZAR CONFIGURACIÓN PARTIDA (Solo si está en espera)
// -------------------------------------------------------------------------
exports.actualizarPartida = async (req, res) => {
    const { id } = req.params;
    const datosUpdate = req.body;

    try {
        // Primero verificamos el estado
        const partidaOriginal = await Partida.findById(id);

        if (!partidaOriginal) {
            return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada.' });
        }

        // Si la partida ya empezó o terminó, no deberíamos dejar cambiar reglas críticas
        if (partidaOriginal.estadoPartida !== tipos.ESTADOS_PARTIDA.ESPERA) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede editar una partida que ya ha comenzado o finalizado.'
            });
        }

        const partidaActualizada = await Partida.findByIdAndUpdate(
            id,
            datosUpdate,
            { new: true }
        );

        res.json({
            ok: true,
            mensaje: 'Configuración de partida actualizada.',
            data: partidaActualizada
        });

    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 11. ELIMINAR PARTIDA (Y limpiar participaciones)
// -------------------------------------------------------------------------
exports.eliminarPartida = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Eliminar la partida
        const partidaEliminada = await Partida.findByIdAndDelete(id);

        if (!partidaEliminada) {
            return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada.' });
        }

        // 2. LIMPIEZA: Eliminar todas las participaciones asociadas a esta partida
        // Si no hacemos esto, quedan registros huérfanos en la colección Participaciones
        const resultadoLimpieza = await Participacion.deleteMany({ idPartida: id });

        res.json({
            ok: true,
            mensaje: 'Partida y participaciones asociadas eliminadas.',
            data: {
                partidaId: partidaEliminada._id,
                registrosAsociadosEliminados: resultadoLimpieza.deletedCount
            }
        });

    } catch (error) {
        console.error("Error al eliminar partida:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -------------------------------------------------------------------------

// Auxiliar Ranking
function obtenerRanking(jugadores) {
    return jugadores.sort((a, b) => b.puntuacionTotal - a.puntuacionTotal).slice(0, 5);
}
// Función auxiliar para centralizar el cierre de partida
async function cerrarPartidaLogic(partida, io) {
    // 1. Marcar partida como finalizada
    partida.estadoPartida = 'finalizada';
    partida.finEn = Date.now();
    await partida.save();

    // 2. Cerrar todas las participaciones asociadas (Pasar estado a 'finalizada')
    // Esto es importante para que en el historial salgan como exámenes terminados
    try {
        await Participacion.updateMany(
            { idPartida: partida._id },
            {
                $set: {
                    estado: 'finalizada',
                    finEn: Date.now()
                }
            }
        );
    } catch (error) {
        console.error("Error cerrando participaciones:", error);
    }

    // 3. Emitir evento final
    if (io) {
        io.to(partida.pin).emit('fin_partida', {
            mensaje: 'Juego terminado',
            ranking: obtenerRanking(partida.jugadores)
        });
    }
}
// Función auxiliar para PIN
function generarPinUnico() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Función auxiliar del ciclo automático ---
async function gestionarCicloPregunta(partidaDoc, indicePregunta, io) {
    const preguntas = await Pregunta.find({ idCuestionario: partidaDoc.idCuestionario }).sort({ ordenPregunta: 1 });

    // FIN DEL JUEGO
    // FIN DEL JUEGO
    if (indicePregunta >= preguntas.length) {

        // Delegamos TODA la responsabilidad a la función auxiliar
        // Ella se encarga de cambiar estado, guardar fecha, actualizar alumnos y avisar por Socket.
        await cerrarPartidaLogic(partidaDoc, io);

        return;
    }

    // LANZAR PREGUNTA
    const preguntaActual = preguntas[indicePregunta];
    const tiempo = preguntaActual.tiempoLimiteSeg || 20;

    const datosPregunta = {
        idPregunta: preguntaActual._id,
        textoPregunta: preguntaActual.textoPregunta,
        tipoPregunta: preguntaActual.tipoPregunta,
        tiempoLimite: tiempo,
        puntos: preguntaActual.puntuacionMax,
        numeroPregunta: indicePregunta + 1,
        totalPreguntas: preguntas.length,
        opciones: preguntaActual.opciones.map(op => ({
            idOpcion: op._id,
            textoOpcion: op.textoOpcion
        }))
    };

    io.to(partidaDoc.pin).emit('nueva_pregunta', datosPregunta);

    // PROGRAMAR EL FIN DE LA PREGUNTA
    const timeoutId = setTimeout(async () => {
        io.to(partidaDoc.pin).emit('tiempo_agotado', { mensaje: 'Tiempo agotado. Resultados...' });

        // Pausa de 5s antes de la siguiente
        setTimeout(async () => {
            const partidaActualizada = await Partida.findById(partidaDoc._id);
            gestionarCicloPregunta(partidaActualizada, indicePregunta + 1, io);
        }, 5000);

    }, tiempo * 1000);

    temporizadoresPartidas[partidaDoc._id] = timeoutId;
}