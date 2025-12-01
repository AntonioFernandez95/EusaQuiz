const Participacion = require('../models/participacion');
const Partida = require('../models/partida');
const Pregunta = require('../models/pregunta');

// 1. Responder una pregunta (El núcleo del juego)
exports.enviarRespuesta = async (req, res) => {
    const { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado } = req.body;
    const io = req.app.get('socketio');

    try {
        // A. Buscar la participación activa del alumno
        const participacion = await Participacion.findOne({ idPartida, idAlumno });
        if (!participacion) {
            return res.status(404).json({ ok: false, mensaje: 'No estás participando en esta partida.' });
        }

        // B. Evitar duplicados (trampas o doble clic)
        const yaRespondida = participacion.respuestas.some(r => r.idPregunta.toString() === idPregunta);
        
        // En modo 'en_vivo', no se permite cambiar respuesta. En 'programada' (examen), sí se suele permitir.
        if (participacion.modo === 'en_vivo' && yaRespondida) {
            return res.status(400).json({ ok: false, mensaje: 'Ya respondiste a esta pregunta.' });
        }

        // C. Validar la pregunta y calcular corrección
        const preguntaDoc = await Pregunta.findById(idPregunta);
        if (!preguntaDoc) return res.status(404).json({ ok: false, mensaje: 'Pregunta no encontrada' });

        // --- Lógica de Corrección ---
        let esCorrecta = true;
        
        // Obtenemos índices de opciones correctas de la BD
        const indicesCorrectos = preguntaDoc.opciones
            .map((op, i) => op.esCorrecta ? i : -1)
            .filter(i => i !== -1).sort();
        
        const marcadasSorted = opcionesMarcadas.sort();

        // Comparamos arrays
        if (JSON.stringify(indicesCorrectos) !== JSON.stringify(marcadasSorted)) {
            esCorrecta = false;
        }

        // --- Cálculo de Puntos ---
        let puntosGanados = 0;
        if (esCorrecta) {
            if (participacion.modo === 'en_vivo') {
                // Fórmula de Gamificación: Puntos reducidos por tiempo
                const tiempoLimite = preguntaDoc.tiempoLimiteSeg || 20;
                const ratio = 1 - (tiempoEmpleado / tiempoLimite) / 2;
                puntosGanados = Math.ceil(preguntaDoc.puntuacionMax * ratio);
            } else {
                // Modo Examen: Puntos fijos
                puntosGanados = preguntaDoc.puntuacionMax;
            }
        }

        // D. Construir el objeto respuesta
        const nuevaRespuesta = {
            idPregunta: preguntaDoc._id,
            opcionesMarcadas,
            esCorrecta,
            tiempoRespuestaSeg: tiempoEmpleado,
            puntosObtenidos: puntosGanados,
            respondidaEn: new Date()
        };

        // E. Actualizar la Participación (Atomic Update)
        // Usamos $pull primero por si es un re-intento en modo examen (eliminar la anterior)
        if (participacion.modo === 'programada' && yaRespondida) {
             await Participacion.updateOne(
                { _id: participacion._id },
                { $pull: { respuestas: { idPregunta: preguntaDoc._id } } }
            );
             // Restamos estadísticas previas (simplificado: re-calculo total abajo es mejor, pero aquí hacemos patch)
        }

        // Actualizamos con $push (añadir respuesta) y $inc (incrementar contadores)
        const updateQuery = {
            $push: { respuestas: nuevaRespuesta },
            $inc: { 
                puntuacionTotal: puntosGanados,
                aciertos: esCorrecta ? 1 : 0,
                fallos: esCorrecta ? 0 : 1,
                // sinResponder se calcula al final restando total - respondidas
            }
        };

        await Participacion.updateOne({ _id: participacion._id }, updateQuery);

        // F. Feedback en tiempo real (Sockets) SOLO si es en vivo
        if (participacion.modo === 'en_vivo' && io) {
            // Buscamos la partida para sacar el PIN
            const partida = await Partida.findById(idPartida);
            if (partida) {
                io.to(partida.pin).emit('actualizacion_respuestas', {
                    // Solo enviamos señal de "alguien respondió", no quién ni qué
                    mensaje: 'Nuevo voto registrado'
                });
            }
        }

        res.json({
            ok: true,
            mensaje: 'Respuesta registrada',
            data: { esCorrecta, puntosGanados }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 2. Obtener mi progreso (Para el alumno)
exports.obtenerMiProgreso = async (req, res) => {
    const { idPartida, idAlumno } = req.params;
    try {
        const participacion = await Participacion.findOne({ idPartida, idAlumno });
        if (!participacion) return res.status(404).json({ ok: false, mensaje: 'No encontrado' });
        
        res.json({ ok: true, data: participacion });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 3. Obtener Ranking de la partida (Para el profesor)
exports.obtenerRankingPartida = async (req, res) => {
    const { idPartida } = req.params;
    try {
        // Buscamos todas las participaciones de esa partida
        const ranking = await Participacion.find({ idPartida })
            .select('idAlumno puntuacionTotal aciertos fallos') // Solo campos necesarios
            .sort({ puntuacionTotal: -1 }) // Orden descendente (Mayor puntuación primero)
            .limit(10); // Top 10

        // Nota: Si tuvieras colección Usuarios, aquí harías un .populate() para sacar el nombre real
        // Como usas idPortal (String), el front deberá machear el nombre si lo tiene, o mostrar el ID.

        res.json({ ok: true, data: ranking });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};