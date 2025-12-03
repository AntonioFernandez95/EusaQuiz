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
  if (!Array.isArray(opcionesMarcadas)) opcionesMarcadas = [];
  // Aseguramos que sean números y ordenamos para comparar
  const marcadasSorted = opcionesMarcadas.map(n => Number(n)).sort((a, b) => a - b);

  // Calcular índices correctos desde la pregunta en BD
  const indicesCorrectos = preguntaDoc.opciones
    .map((op, i) => (op.esCorrecta ? i : -1))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);

  // Comparar arrays para saber si es correcta
  let esCorrecta = true;
  if (indicesCorrectos.length !== marcadasSorted.length) esCorrecta = false;
  else {
    for (let i = 0; i < indicesCorrectos.length; i++) {
      if (indicesCorrectos[i] !== marcadasSorted[i]) {
        esCorrecta = false;
        break;
      }
    }
  }

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
  if (modo !== 'en_vivo' && yaRespondida) {
    await Participacion.updateOne(
      { _id: participacion._id },
      { $pull: { respuestas: { idPregunta: preguntaDoc._id } } }
    );
    // Nota: aquí podríamos recomputar contadores si fuera necesario; simplificamos actualizando con $inc abajo
  }

  // Update atómico: push respuesta y ajustar contadores
  const incObject = {
    puntuacionTotal: puntosGanados,
    aciertos: esCorrecta ? 1 : 0,
    fallos: esCorrecta ? 0 : 1
  };

  // Ejecutar update
  await Participacion.updateOne(
    { _id: participacion._id },
    {
      $push: { respuestas: nuevaRespuesta },
      $inc: incObject
    }
  );

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

  const participacion = await Participacion.findOne({ idPartida, idAlumno });
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

module.exports = {
  enviarRespuesta,
  obtenerMiProgreso,
  obtenerRankingPartida
};