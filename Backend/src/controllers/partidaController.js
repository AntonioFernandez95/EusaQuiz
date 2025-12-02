const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
const mongoose = require('mongoose');
const tipos = require('../utils/constants');

// --- GESTIÓN DE TIMERS GLOBAL ---
const temporizadoresPartidas = {}; 

// -------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -------------------------------------------------------------------------

function generarPinUnico() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function obtenerRanking(jugadores) {
    return jugadores
        .sort((a, b) => b.puntuacionTotal - a.puntuacionTotal)
        .slice(0, 5)
        .map(j => ({
            nombre: j.nombreAlumno,
            puntos: j.puntuacionTotal || 0
        }));
}

/**
 * 🛑 CONCLUIR PREGUNTA
 */
async function concluirPregunta(partidaId, indicePregunta, io) {
    const pId = String(partidaId);

    console.log(`🛑 Intento de concluir pregunta índicé ${indicePregunta} (Partida ${pId})`);

    // A. SEMÁFORO
    if (!temporizadoresPartidas[pId]) {
        console.warn(`⚠️ Semáforo: La pregunta ${indicePregunta} ya se estaba cerrando. Ignorando.`);
        return;
    }

    // B. MATAR TIMER
    clearTimeout(temporizadoresPartidas[pId]);
    delete temporizadoresPartidas[pId];
    console.log("✅ Timer cancelado. Procesando cierre...");

    try {
        const partida = await Partida.findById(partidaId);
        if (!partida) return;

        const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
        
        // Validación de índice
        if (!preguntas[indicePregunta]) {
            console.error("Error: Índice fuera de rango en concluirPregunta");
            return;
        }
        
        const preguntaActual = preguntas[indicePregunta];
        const participaciones = await Participacion.find({ idPartida: partidaId });

        // Estadísticas
        const statsPregunta = [0, 0, 0, 0];
        participaciones.forEach(p => {
            const r = p.respuestas.find(res => res.idPregunta.toString() === preguntaActual._id.toString());
            if (r && r.opcionesMarcadas.length > 0) {
                const idx = r.opcionesMarcadas[0];
                if (statsPregunta[idx] !== undefined) statsPregunta[idx]++;
            }
        });

        const indiceCorrecto = preguntaActual.opciones.findIndex(op => op.esCorrecta);

        // Emitir
        io.to(partida.pin).emit('tiempo_agotado', {
            mensaje: 'Resultados',
            stats: statsPregunta,
            correcta: indiceCorrecto,
            rankingParcial: obtenerRanking(partida.jugadores)
        });

        // SIGUIENTE PASO (Pausa 8s)
        console.log(`⏳ Esperando 8s antes de lanzar pregunta ${indicePregunta + 2}...`);
        setTimeout(() => {
            // Pasamos el objeto partida FRESCO para evitar problemas de versión
            gestionarCicloPregunta(partida, indicePregunta + 1, io);
        }, 8000);

    } catch (error) {
        console.error("Error crítico al concluir pregunta:", error);
    }
}

/**
 * 🔄 CICLO PRINCIPAL
 */
async function gestionarCicloPregunta(partidaDoc, indicePregunta, io) {
    const pId = String(partidaDoc._id);

    // Limpieza defensiva
    if (temporizadoresPartidas[pId]) {
        clearTimeout(temporizadoresPartidas[pId]);
        delete temporizadoresPartidas[pId];
    }

    const preguntas = await Pregunta.find({ idCuestionario: partidaDoc.idCuestionario }).sort({ ordenPregunta: 1 });

    // FIN DEL JUEGO
    if (indicePregunta >= preguntas.length) {
        await cerrarPartidaLogic(partidaDoc, io);
        return;
    }

    // ACTUALIZAR BD
    await Partida.findByIdAndUpdate(partidaDoc._id, { preguntaActual: indicePregunta });
    partidaDoc.preguntaActual = indicePregunta; 

    const preguntaActual = preguntas[indicePregunta];
    const tiempo = partidaDoc.configuracionEnvivo?.tiempoPorPreguntaSeg || preguntaActual.tiempoLimiteSeg || 20;

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

    console.log(`📡 --- INICIANDO PREGUNTA ${indicePregunta + 1} (ID: ${preguntaActual._id}) ---`);
    io.to(partidaDoc.pin).emit('nueva_pregunta', datosPregunta);

    // TIMER
    const timeoutId = setTimeout(() => {
        console.log("⌛ Tiempo agotado por reloj.");
        concluirPregunta(partidaDoc._id, indicePregunta, io);
    }, tiempo * 1000);

    temporizadoresPartidas[pId] = timeoutId;
}

/**
 * 🏁 CIERRE
 */
async function cerrarPartidaLogic(partida, io) {
    console.log("🏁 Finalizando partida...");
    
    const pId = String(partida._id);
    if(temporizadoresPartidas[pId]) {
        clearTimeout(temporizadoresPartidas[pId]);
        delete temporizadoresPartidas[pId];
    }

    partida.estadoPartida = tipos.ESTADOS_PARTIDA.FINALIZADA;
    partida.finEn = Date.now();
    await partida.save();

    await Participacion.updateMany(
        { idPartida: partida._id },
        { $set: { estado: 'finalizada', finEn: Date.now() } }
    );

    let reporteGlobal = [];
    try {
        const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
        const participaciones = await Participacion.find({ idPartida: partida._id });

        reporteGlobal = preguntas.map(pregunta => {
            const stats = [0, 0, 0, 0];
            participaciones.forEach(p => {
                const r = p.respuestas.find(resp => resp.idPregunta.toString() === pregunta._id.toString());
                if (r && r.opcionesMarcadas.length > 0) {
                    const idx = r.opcionesMarcadas[0];
                    if (stats[idx] !== undefined) stats[idx]++;
                }
            });
            return {
                textoPregunta: pregunta.textoPregunta,
                opciones: pregunta.opciones,
                stats: stats,
                correcta: pregunta.opciones.findIndex(op => op.esCorrecta)
            };
        });
    } catch (e) { console.error(e); }

    io.to(partida.pin).emit('fin_partida', {
        mensaje: 'Juego terminado',
        ranking: obtenerRanking(partida.jugadores),
        reporte: reporteGlobal
    });
}


// -------------------------------------------------------------------------
// CONTROLADORES API
// -------------------------------------------------------------------------

exports.crearPartida = async (req, res) => {
    const { idCuestionario, idProfesor, modoAcceso, tipoPartida, configuracionEnvivo, configuracionProgramada, fechas } = req.body;
    try {
        const cuestionarioPadre = await Cuestionario.findById(idCuestionario);
        if (!cuestionarioPadre) return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado.' });

        const nuevaPartida = new Partida({
            idCuestionario,
            idProfesor,
            pin: generarPinUnico(),
            tipoPartida: tipoPartida || tipos.MODOS_JUEGO.EN_VIVO,
            modoAcceso: modoAcceso || tipos.TIPO_LOBBY.PUBLICA,
            configuracionEnvivo: configuracionEnvivo || {},
            configuracionProgramada: configuracionProgramada || {},
            fechas: fechas || {},
            estadoPartida: tipos.ESTADOS_PARTIDA.ESPERA
        });

        await nuevaPartida.save();
        res.status(201).json({ ok: true, mensaje: 'Partida creada', data: { id: nuevaPartida._id, pin: nuevaPartida.pin } });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.unirseAPartida = async (req, res) => {
    const { pin } = req.params;
    const { idAlumno, nombreAlumno } = req.body;
    try {
        const partida = await Partida.findOne({ pin, estadoPartida: { $ne: tipos.ESTADOS_PARTIDA.FINALIZADA } });
        if (!partida) return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada.' });

        const jugadorExiste = partida.jugadores.some(j => j.idAlumno === idAlumno);
        if (!jugadorExiste) {
            partida.jugadores.push({ idAlumno, nombreAlumno, estado: tipos.ESTADO_USER.ACTIVO });
            partida.numParticipantes = partida.jugadores.length;
            await partida.save();

            const nuevaParticipacion = new Participacion({ idPartida: partida._id, idAlumno, tipoPartida: partida.tipoPartida });
            await nuevaParticipacion.save();

            // EMITIR EVENTO (AQUÍ ESTÁ EL CAMBIO PARA EL FRONTEND)
            const io = req.app.get('socketio');
            if (io) {
                io.to(pin).emit('nuevo_jugador', { 
                    nombre: nombreAlumno, 
                    idAlumno: idAlumno, // <--- ENVIAMOS EL ID
                    total: partida.numParticipantes 
                });
            }
        }
        res.json({
            ok: true, mensaje: 'Unido',
            data: { idPartida: partida._id, modo: partida.tipoPartida, configuracion: partida.tipoPartida === 'en_vivo' ? partida.configuracionEnvivo : partida.configuracionProgramada }
        });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.iniciarPartida = async (req, res) => {
    const { id } = req.params;
    const io = req.app.get('socketio');
    try {
        const partida = await Partida.findById(id);
        if (!partida) return res.status(404).json({ ok: false, mensaje: 'No encontrada' });

        partida.estadoPartida = tipos.ESTADOS_PARTIDA.ACTIVA;
        partida.inicioEn = Date.now();
        await partida.save();

        if (partida.tipoPartida === tipos.MODOS_JUEGO.EN_VIVO) {
            gestionarCicloPregunta(partida, 0, io);
            return res.json({ ok: true, mensaje: 'Iniciada' });
        }
        res.json({ ok: true, mensaje: 'Examen iniciado' });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

// --- ENVIAR RESPUESTA ---
exports.enviarRespuesta = async (req, res) => {
    const { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado } = req.body;
    const io = req.app.get('socketio');

    try {
        const partida = await Partida.findById(idPartida);
        if (!partida || partida.estadoPartida !== tipos.ESTADOS_PARTIDA.ACTIVA) return res.status(400).json({ ok: false, mensaje: 'Partida no activa' });

        const participacion = await Participacion.findOne({ idPartida, idAlumno });
        if (!participacion) return res.status(404).json({ ok: false, mensaje: 'No participas' });

        if (participacion.respuestas.some(r => r.idPregunta.toString() === idPregunta)) {
            return res.status(400).json({ ok: false, mensaje: 'Ya respondida' });
        }

        const preguntaDoc = await Pregunta.findById(idPregunta);
        
        // Puntos
        let esCorrecta = true;
        const indicesCorrectos = preguntaDoc.opciones.map((op, i) => op.esCorrecta ? i : -1).filter(i => i !== -1);
        if (opcionesMarcadas.length !== indicesCorrectos.length) esCorrecta = false;
        else {
            for (let op of opcionesMarcadas) if (!indicesCorrectos.includes(op)) { esCorrecta = false; break; }
        }

        let puntosGanados = 0;
        if (esCorrecta) {
            const max = preguntaDoc.puntuacionMax || 1000;
            const tLimite = partida.configuracionEnvivo?.tiempoPorPreguntaSeg || preguntaDoc.tiempoLimiteSeg || 20;
            const factor = 1 - (Math.min(tiempoEmpleado, tLimite) / tLimite) / 2;
            puntosGanados = Math.round(max * factor);
        }

        // Guardar
        participacion.respuestas.push({ idPregunta, opcionesMarcadas, esCorrecta, tiempoRespuestaSeg: tiempoEmpleado, puntosObtenidos: puntosGanados });
        participacion.puntuacionTotal += puntosGanados;
        if (esCorrecta) participacion.aciertos++; else participacion.fallos++;
        await participacion.save();

        const idx = partida.jugadores.findIndex(j => j.idAlumno === idAlumno);
        if (idx !== -1) {
            partida.jugadores[idx].puntuacionTotal = participacion.puntuacionTotal;
            await partida.save();
        }

        // --- VERIFICACIÓN DE SALTO AUTOMÁTICO ---
        const respuestasCount = await Participacion.countDocuments({
            idPartida: idPartida,
            "respuestas.idPregunta": idPregunta
        });

        const totalParticipantes = partida.jugadores.length;

        console.log(`⚡ Progreso: ${respuestasCount}/${totalParticipantes} (Pregunta ID: ${idPregunta})`);

        if (respuestasCount >= totalParticipantes) {
            console.log("🚀 TRIGGER MANUAL: Todos han respondido.");
            
            // INDICE CALCULADO REAL
            const preguntasTodas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
            const indiceCalculado = preguntasTodas.findIndex(p => p._id.toString() === idPregunta);

            if (indiceCalculado !== -1) {
                console.log(`🔎 Índice calculado real: ${indiceCalculado}. Ejecutando cierre...`);
                await concluirPregunta(idPartida, indiceCalculado, io);
            } else {
                console.error("❌ Error: No se encontró el índice de la pregunta respondida.");
            }
        }

        res.json({ ok: true, data: { esCorrecta, puntosGanados } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// CRUD Standard
exports.obtenerTodasPartidas = async (req, res) => {
    try {
        const { idProfesor, estado } = req.query;
        let filtro = {};
        if (idProfesor) filtro.idProfesor = idProfesor;
        if (estado) filtro.estadoPartida = estado;
        const partidas = await Partida.find(filtro).populate('idCuestionario', 'titulo').sort({ inicioEn: -1 });
        res.json({ ok: true, total: partidas.length, data: partidas });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.obtenerDetallePartida = async (req, res) => {
    try {
        const partida = await Partida.findById(req.params.id).populate('idCuestionario');
        if (!partida) return res.status(404).json({ ok: false });
        res.json({ ok: true, data: partida });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.actualizarPartida = async (req, res) => {
    try {
        const partida = await Partida.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ ok: true, data: partida });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.eliminarPartida = async (req, res) => {
    try {
        await Partida.findByIdAndDelete(req.params.id);
        await Participacion.deleteMany({ idPartida: req.params.id });
        res.json({ ok: true, mensaje: 'Eliminada' });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.obtenerPartidaPorPin = async (req, res) => {
    try {
        const partida = await Partida.findOne({ pin: req.params.pin });
        if (!partida) return res.status(404).json({ ok: false });
        res.json({ ok: true, data: partida });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};

exports.obtenerPreguntasExamen = async (req, res) => {
    try {
        const partida = await Partida.findById(req.params.idPartida);
        const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
        res.json({ ok: true, data: preguntas });
    } catch (error) { res.status(500).json({ ok: false }); }
};

exports.finalizarPartida = async (req, res) => {
    try {
        const partida = await Partida.findById(req.params.id);
        if (partida) {
            const io = req.app.get('socketio');
            await cerrarPartidaLogic(partida, io);
            res.json({ ok: true });
        } else res.status(404).json({ ok: false });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
};