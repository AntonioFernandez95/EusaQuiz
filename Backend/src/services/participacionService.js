// src/services/participacionService.js
// Servicio que centraliza la lógica de Participación:
// - Registrar respuestas (corrección, cálculo de puntos, updates atómicos)
// - Obtener progreso de un alumno en una partida
// - Obtener ranking de una partida
//
// Observaciones:
// - El service lanza errores con `.status` (httpError) para que los controllers
//   traduzcan a códigos HTTP fácilmente.
// - En este primer paso los timers siguen en memoria / DB; para escalar, mover
//   estado temporal a Redis y usar socket.io-adapter con Redis.
// - Se intenta conservar compatibilidad con la API existente.

const Participacion = require('../models/participacion');
const Partida = require('../models/partida');
const Pregunta = require('../models/pregunta');
const mongoose = require('mongoose');

/**
 * Helper para crear errores con código HTTP
 * @param {number} status
 * @param {string} message
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * enviarRespuesta: lógica central para procesar una respuesta enviada por un alumno.
 * Recibe payload con: { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado }
 * and optional io (Socket.IO instance) to emit realtime updates.
 *
 * Retorna un objeto con { esCorrecta, puntosGanados, yaRespondida? } o lanza error.
 */
async function enviarRespuesta(payload, io) {
  const { idPartida, idAlumno, idPregunta } = payload;
  let { opcionesMarcadas = [], tiempoEmpleado = 0 } = payload;

  // Validaciones básicas de entrada
  if (!idPartida || !idAlumno || !idPregunta) {
    throw httpError(400, 'idPartida, idAlumno y idPregunta son obligatorios.');
  }

  // Buscar la participación activa
  const participacion = await Participacion.findOne({ idPartida, idAlumno });
  if (!participacion) throw httpError(404, 'No estás participando en esta partida.');

  // Determinar el "modo" real (compatibilidad: participacion.tipoPartida o participacion.modo)
  const modo = participacion.tipoPartida || participacion.modo || 'en_vivo';

  // Evitar duplicados en modo en_vivo
  const yaRespondida = participacion.respuestas.some(r => r.idPregunta.toString() === String(idPregunta));
  if (modo === 'en_vivo' && yaRespondida) {
    // En vivo no se permite reintento → devolvemos un indicador para controller
    return { yaRespondida: true };
  }

  // Comprobar que la pregunta existe
  const preguntaDoc = await Pregunta.findById(idPregunta);
  if (!preguntaDoc) throw httpError(404, 'Pregunta no encontrada');

  // Normalizar opciones marcadas: array de índices (números)
  if (!Array.isArray(opcionesMarcadas)) {
    console.log(`[Respuesta] WARN: opcionesMarcadas no es array:`, typeof opcionesMarcadas);
    opcionesMarcadas = [];
  }

  // Aseguramos que sean números y ordenamos para comparar
  const marcadasSorted = opcionesMarcadas.map(n => {
    if (typeof n === 'string' && n.startsWith('idx_')) {
      const val = Number(n.replace('idx_', ''));
      return isNaN(val) ? null : val;
    }
    const val = Number(n);
    return isNaN(val) ? null : val;
  }).filter(n => n !== null).sort((a, b) => a - b);

  // Calcular índices correctos desde la pregunta en BD
  const indicesCorrectos = preguntaDoc.opciones
    .map((op, i) => (op.esCorrecta ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);

  // Comparar arrays para saber si es correcta
  let esCorrecta = false;
  if (indicesCorrectos.length > 0 && indicesCorrectos.length === marcadasSorted.length) {
    esCorrecta = true;
    for (let i = 0; i < indicesCorrectos.length; i++) {
      if (indicesCorrectos[i] !== marcadasSorted[i]) {
        esCorrecta = false;
        break;
      }
    }
  }

  console.log(`[Respuesta] Partida: ${idPartida}, Pregunta: ${idPregunta}, Modo: ${modo}`);
  console.log(`[Respuesta] Indices Correctos: ${indicesCorrectos}, Marcados: ${marcadasSorted} => EsCorrecta: ${esCorrecta}`);

  // Cálculo de puntos: distinta lógica para "en_vivo" y "programada"/examen
  let puntosGanados = 0;
  if (esCorrecta) {
    const max = preguntaDoc.puntuacionMax || 1000;
    if (modo === 'en_vivo') {
      const tLimite = preguntaDoc.tiempoLimiteSeg || 20;
      // ratio: más puntos si se responde rápido; cortamos valores extremos
      const tiempo = Math.max(0, Math.min(tiempoEmpleado || 0, tLimite));
      const factor = 1 - (tiempo / tLimite) / 2; // entre 0.5 y 1
      puntosGanados = Math.round(max * factor);
    } else {
      // Programada / examen: puntos completos por respuesta correcta
      puntosGanados = Math.round(max);
    }
  }

  // Construir el objeto de respuesta a insertar
  const nuevaRespuesta = {
    idPregunta: preguntaDoc._id,
    opcionesMarcadas: marcadasSorted,
    esCorrecta,
    tiempoRespuestaSeg: tiempoEmpleado,
    puntosObtenidos: puntosGanados,
    respondidaEn: new Date()
  };

  // Si es modo programada y ya había respuesta, eliminamos la anterior para reemplazarla
  let anteriores = { puntos: 0, acierto: 0, fallo: 0 };

  if (modo !== 'en_vivo' && yaRespondida) {
    const respAnt = participacion.respuestas.find(r => r.idPregunta.toString() === String(idPregunta));
    if (respAnt) {
      anteriores.puntos = respAnt.puntosObtenidos || 0;
      anteriores.acierto = respAnt.esCorrecta ? 1 : 0;
      anteriores.fallo = respAnt.esCorrecta ? 0 : 1;
    }

    await Participacion.updateOne(
      { _id: participacion._id },
      { $pull: { respuestas: { idPregunta: preguntaDoc._id } } }
    );
  }

  // Update atómico: push respuesta y ajustar contadores con DELTA
  const incObject = {
    puntuacionTotal: puntosGanados - anteriores.puntos,
    aciertos: (esCorrecta ? 1 : 0) - anteriores.acierto,
    fallos: (esCorrecta ? 0 : 1) - anteriores.fallo
  };

  // Ejecutar update
  await Participacion.updateOne(
    { _id: participacion._id },
    {
      $push: { respuestas: nuevaRespuesta },
      $inc: incObject
    }
  );

  // TAMBIÉN actualizar el subdocumento jugadores en Partida para que el reporte muestre stats correctas
  try {
    const partida = await Partida.findById(idPartida);
    if (partida) {
      const jugadorIndex = partida.jugadores.findIndex(j => j.idAlumno === idAlumno);
      if (jugadorIndex !== -1) {

        const currentAciertos = partida.jugadores[jugadorIndex].aciertos || 0;
        const currentFallos = partida.jugadores[jugadorIndex].fallos || 0;
        const currentPuntos = partida.jugadores[jugadorIndex].puntuacionTotal || 0;

        partida.jugadores[jugadorIndex].aciertos = currentAciertos + incObject.aciertos;
        partida.jugadores[jugadorIndex].fallos = currentFallos + incObject.fallos;
        partida.jugadores[jugadorIndex].puntuacionTotal = currentPuntos + incObject.puntuacionTotal;

        // Marcar el subdocumento como modificado para que MongoDB lo guarde
        partida.markModified('jugadores');
        await partida.save();

        console.log(`[Stats] Actualizado jugador ${idAlumno}: aciertos=${partida.jugadores[jugadorIndex].aciertos}, fallos=${partida.jugadores[jugadorIndex].fallos}, puntos=${partida.jugadores[jugadorIndex].puntuacionTotal}`);
      }
    }
  } catch (statsErr) {
    console.error('Error actualizando estadísticas de jugador en Partida:', statsErr);
    // No lanzamos error para no bloquear la respuesta
  }

  // Actualizar el objeto participacion local (opcional, para emitir info)
  // Recuperamos la partida para obtener PIN si hay que emitir sockets
  if (modo === 'en_vivo' && io) {
    try {
      const partida = await Partida.findById(idPartida);
      if (partida) {
        // Emitimos un evento genérico de progreso (no enviamos datos sensibles)
        io.to(partida.pin).emit('actualizacion_respuestas', {
          mensaje: 'Nuevo voto registrado'
        });
      }
    } catch (emitErr) {
      // Emit fallbacks: no queremos bloquear la respuesta por fallos en el emit
      console.error('Error emitiendo socket en enviarRespuesta:', emitErr);
    }
  }

  // Si todo correcto, devolvemos el resultado
  return { esCorrecta, puntosGanados, yaRespondida: false };
}

/**
 * obtenerMiProgreso: obtiene la participación de un alumno en una partida
 * @param {string} idPartida
 * @param {string} idAlumno
 * @returns Participacion document o throws 404
 */
async function obtenerMiProgreso(idPartida, idAlumno) {
  if (!idPartida || !idAlumno) throw httpError(400, 'idPartida e idAlumno son requeridos.');

  const participacion = await Participacion.findOne({ idPartida, idAlumno })
    .populate({
      path: 'respuestas.idPregunta',
      select: 'textoPregunta opciones' // Select fields we need for the report
    });
  if (!participacion) throw httpError(404, 'No encontrado');
  return participacion;
}

/**
 * obtenerRankingPartida: devuelve un ranking de la partida (top N)
 * @param {string} idPartida
 * @param {number} limit (opcional)
 * @returns array de participaciones ordenadas
 */
async function obtenerRankingPartida(idPartida, limit = 10) {
  if (!idPartida) throw httpError(400, 'idPartida es requerido.');

  const ranking = await Participacion.find({ idPartida })
    .select('idAlumno puntuacionTotal aciertos fallos')
    .sort({ puntuacionTotal: -1 })
    .limit(limit);

  return ranking;
}


/**
 * 4. Obtener Historial de un Alumno
 */
async function obtenerHistorialAlumno(idAlumno) {
  // Buscamos todas las participaciones de este alumno
  // y populamos la partida -> y luego el cuestionario de esa partida
  const participaciones = await Participacion.find({ idAlumno })
    .populate({
      path: 'idPartida',
      populate: { path: 'idCuestionario' }
    })
    .sort({ finEn: -1 }); // Las más recientes primero

  return participaciones.map(p => {
    const partida = p.idPartida;
    const cuestionario = partida ? partida.idCuestionario : null;

    return {
      _id: p._id,
      idPartida: {
        _id: partida ? partida._id : null,
        nombrePartida: partida ? partida.nombrePartida : null,
        idCuestionario: {
          titulo: cuestionario ? cuestionario.titulo : 'Desconocido',
          categoria: cuestionario ? cuestionario.asignatura : 'General',
          asignatura: cuestionario ? cuestionario.asignatura : 'General',
          curso: cuestionario ? cuestionario.curso : ''
        },
        curso: (partida && partida.curso) ? partida.curso : (cuestionario ? cuestionario.curso : ''),
        asignatura: (partida && partida.asignatura) ? partida.asignatura : (cuestionario ? cuestionario.asignatura : ''),
        finalizadaEn: p.finEn || p.fechaInicio
      },
      puntuacionTotal: p.puntuacionTotal || 0,
      respuestasCorrectas: p.aciertos || 0,
      totalPreguntas: (cuestionario && cuestionario.numPreguntas > 0) ? cuestionario.numPreguntas : (p.respuestas?.length || 0),
      aciertos: p.aciertos || 0,
      fallos: p.fallos || 0,
      fecha: p.fechaInicio,
      pinPartida: partida ? partida.pin : '---',
      tipoPartida: partida ? partida.tipoPartida : 'en_vivo'
    };
  });
}

module.exports = {
  enviarRespuesta,
  obtenerMiProgreso,
  obtenerRankingPartida,
  obtenerHistorialAlumno
};