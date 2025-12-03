// Servicio: centraliza la lógica de Partida (timers, ciclo, cierre, scoring)
const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
const tipos = require('../utils/constants');

/**
 * temporizadoresPartidas: semáforo y timers por partida (clave: partidaId)
 * Nota: mantener en memoria es suficiente para desarrollo. Para producción escalable
 * se recomienda Redis u otro store compartido entre procesos/nodos.
 */
const temporizadoresPartidas = {};

/* --------------------- UTILIDADES --------------------- */
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

/* --------------------- LÓGICA DE JUEGO (INTERNAL) --------------------- */

/**
 * concluirPregunta: cierra una pregunta, calcula stats y emite por socket
 * @param {String|ObjectId} partidaId
 * @param {Number} indicePregunta
 * @param {Server} io - instancia de socket.io
 */
async function concluirPregunta(partidaId, indicePregunta, io) {
  const pId = String(partidaId);

  // Semáforo: si ya se está cerrando, ignorar
  if (!temporizadoresPartidas[pId]) {
    // Ya se estaba cerrando → evitar doble ejecución
    return;
  }

  clearTimeout(temporizadoresPartidas[pId]);
  delete temporizadoresPartidas[pId];

  try {
    const partida = await Partida.findById(partidaId);
    if (!partida) return;

    const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
    if (!preguntas[indicePregunta]) return;

    const preguntaActual = preguntas[indicePregunta];
    const participaciones = await Participacion.find({ idPartida: partidaId });

    const statsPregunta = [0, 0, 0, 0];
    participaciones.forEach(p => {
      const r = p.respuestas.find(res => res.idPregunta.toString() === preguntaActual._id.toString());
      if (r && r.opcionesMarcadas.length > 0) {
        const idx = r.opcionesMarcadas[0];
        if (statsPregunta[idx] !== undefined) statsPregunta[idx]++;
      }
    });

    const indiceCorrecto = preguntaActual.opciones.findIndex(op => op.esCorrecta);

    if (io) {
      io.to(partida.pin).emit('tiempo_agotado', {
        mensaje: 'Resultados',
        stats: statsPregunta,
        correcta: indiceCorrecto,
        rankingParcial: obtenerRanking(partida.jugadores)
      });
    }

    // Pausa y siguiente pregunta
    setTimeout(() => {
      // Recogemos la partida fresca antes de pasarla
      gestionarCicloPregunta(partida, indicePregunta + 1, io).catch(err => console.error(err));
    }, 8000);

  } catch (error) {
    console.error('Error en concluirPregunta:', error);
  }
}

/**
 * gestionarCicloPregunta: enviar nueva pregunta, programar timer y actualizar BD
 * @param {Object} partidaDoc - documento partida (puede venir no actualizado)
 * @param {Number} indicePregunta
 * @param {Server} io
 */
async function gestionarCicloPregunta(partidaDoc, indicePregunta, io) {
  const pId = String(partidaDoc._id);

  // limpieza defensiva del timer anterior
  if (temporizadoresPartidas[pId]) {
    clearTimeout(temporizadoresPartidas[pId]);
    delete temporizadoresPartidas[pId];
  }

  const preguntas = await Pregunta.find({ idCuestionario: partidaDoc.idCuestionario }).sort({ ordenPregunta: 1 });

  // fin del juego
  if (indicePregunta >= preguntas.length) {
    await cerrarPartidaLogic(partidaDoc, io);
    return;
  }

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

  if (io) {
    io.to(partidaDoc.pin).emit('nueva_pregunta', datosPregunta);
  }

  // programar cierre por tiempo
  const timeoutId = setTimeout(() => {
    concluirPregunta(partidaDoc._id, indicePregunta, io).catch(e => console.error(e));
  }, tiempo * 1000);

  temporizadoresPartidas[pId] = timeoutId;
}

/**
 * cerrarPartidaLogic: lógica de cierre final de partida
 * @param {Object} partida
 * @param {Server} io
 */
async function cerrarPartidaLogic(partida, io) {
  const pId = String(partida._id);
  if (temporizadoresPartidas[pId]) {
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
  } catch (e) {
    console.error('Error generando reporte global:', e);
  }

  if (io) {
    io.to(partida.pin).emit('fin_partida', {
      mensaje: 'Juego terminado',
      ranking: obtenerRanking(partida.jugadores),
      reporte: reporteGlobal
    });
  }
}

/* --------------------- API (SERVICIO) EXPORTS --------------------- */

/**
 * crearPartida(data)
 * data: { idCuestionario, idProfesor, modoAcceso, tipoPartida, configuracionEnvivo, configuracionProgramada, fechas }
 */
async function crearPartida(data) {
  const { idCuestionario, idProfesor, modoAcceso, tipoPartida, configuracionEnvivo, configuracionProgramada, fechas } = data;
  const cuestionarioPadre = await Cuestionario.findById(idCuestionario);
  if (!cuestionarioPadre) throw new Error('Cuestionario no encontrado');

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
  return { id: nuevaPartida._id, pin: nuevaPartida.pin };
}

/**
 * unirseAPartida(pin, idAlumno, nombreAlumno, io)
 */
async function unirseAPartida(pin, idAlumno, nombreAlumno, io) {
  const partida = await Partida.findOne({ pin, estadoPartida: { $ne: tipos.ESTADOS_PARTIDA.FINALIZADA } });
  if (!partida) throw new Error('Partida no encontrada');

  const jugadorExiste = partida.jugadores.some(j => j.idAlumno === idAlumno);
  if (!jugadorExiste) {
    partida.jugadores.push({ idAlumno, nombreAlumno, estado: tipos.ESTADO_USER.ACTIVO });
    partida.numParticipantes = partida.jugadores.length;
    await partida.save();

    const nuevaParticipacion = new Participacion({ idPartida: partida._id, idAlumno, tipoPartida: partida.tipoPartida });
    await nuevaParticipacion.save();

    if (io) {
      io.to(pin).emit('nuevo_jugador', {
        nombre: nombreAlumno,
        idAlumno,
        total: partida.numParticipantes
      });
    }
  }

  return {
    idPartida: partida._id,
    modo: partida.tipoPartida,
    configuracion: partida.tipoPartida === 'en_vivo' ? partida.configuracionEnvivo : partida.configuracionProgramada
  };
}

/**
 * iniciarPartida(id, io)
 */
async function iniciarPartida(id, io) {
  const partida = await Partida.findById(id);
  if (!partida) throw new Error('Partida no encontrada');

  partida.estadoPartida = tipos.ESTADOS_PARTIDA.ACTIVA;
  partida.inicioEn = Date.now();
  await partida.save();

  if (partida.tipoPartida === tipos.MODOS_JUEGO.EN_VIVO) {
    // lanzar ciclo
    gestionarCicloPregunta(partida, 0, io).catch(e => console.error(e));
    return { mensaje: 'Iniciada' };
  }
  return { mensaje: 'Examen iniciado' };
}

/**
 * enviarRespuesta(payload, io)
 * payload: { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado }
 */
async function enviarRespuesta(payload, io) {
  const { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado } = payload;
  const partida = await Partida.findById(idPartida);
  if (!partida || partida.estadoPartida !== tipos.ESTADOS_PARTIDA.ACTIVA) throw new Error('Partida no activa');

  const participacion = await Participacion.findOne({ idPartida, idAlumno });
  if (!participacion) throw new Error('No participas');

  if (participacion.respuestas.some(r => r.idPregunta.toString() === idPregunta)) {
    return { yaRespondida: true };
  }

  const preguntaDoc = await Pregunta.findById(idPregunta);

  // calcular acierto
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

  // guardar participacion
  participacion.respuestas.push({ idPregunta, opcionesMarcadas, esCorrecta, tiempoRespuestaSeg: tiempoEmpleado, puntosObtenidos: puntosGanados });
  participacion.puntuacionTotal += puntosGanados;
  if (esCorrecta) participacion.aciertos++; else participacion.fallos++;
  await participacion.save();

  const idx = partida.jugadores.findIndex(j => j.idAlumno === idAlumno);
  if (idx !== -1) {
    partida.jugadores[idx].puntuacionTotal = participacion.puntuacionTotal;
    await partida.save();
  }

  // ver si todos ya respondieron → concluir pregunta
  const respuestasCount = await Participacion.countDocuments({
    idPartida: idPartida,
    "respuestas.idPregunta": idPregunta
  });

  const totalParticipantes = partida.jugadores.length;

  if (respuestasCount >= totalParticipantes) {
    const preguntasTodas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
    const indiceCalculado = preguntasTodas.findIndex(p => p._id.toString() === idPregunta);
    if (indiceCalculado !== -1) {
      await concluirPregunta(idPartida, indiceCalculado, io);
    }
  }

  return { esCorrecta, puntosGanados };
}

/* --------------------- CRUD Y CONSULTAS --------------------- */

async function obtenerTodasPartidas(filtro = {}) {
  const partidas = await Partida.find(filtro).populate('idCuestionario', 'titulo').sort({ inicioEn: -1 });
  return partidas;
}

async function obtenerDetallePartida(id) {
  return await Partida.findById(id).populate('idCuestionario');
}

async function actualizarPartida(id, payload) {
  return await Partida.findByIdAndUpdate(id, payload, { new: true });
}

async function eliminarPartida(id) {
  await Partida.findByIdAndDelete(id);
  await Participacion.deleteMany({ idPartida: id });
  return;
}

async function obtenerPartidaPorPin(pin) {
  return await Partida.findOne({ pin });
}

async function obtenerPreguntasExamen(idPartida) {
  const partida = await Partida.findById(idPartida);
  if (!partida) throw new Error('Partida no encontrada');
  return await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
}

async function finalizarPartida(id, io) {
  const partida = await Partida.findById(id);
  if (!partida) throw new Error('Partida no encontrada');
  await cerrarPartidaLogic(partida, io);
  return;
}

/* --------------------- EXPORTS --------------------- */
module.exports = {
  crearPartida,
  unirseAPartida,
  iniciarPartida,
  enviarRespuesta,
  obtenerTodasPartidas,
  obtenerDetallePartida,
  actualizarPartida,
  eliminarPartida,
  obtenerPartidaPorPin,
  obtenerPreguntasExamen,
  finalizarPartida
};