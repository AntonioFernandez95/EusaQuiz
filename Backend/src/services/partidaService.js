// Servicio: centraliza la lógica de Partida (timers, ciclo, cierre, scoring)
const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
const Usuario = require('../models/usuario');
const tipos = require('../utils/constants');
// Importamos enviarRespuesta desde participacionService (donde está la lógica de respuestas)
const { enviarRespuesta: _enviarRespuestaInternal } = require('./participacionService');
const mongoose = require('mongoose');

// Wrapper para inyectar lógica de control de ciclo tras responder
async function enviarRespuesta(payload, io) {
  // 1. Delegar el guardado de la respuesta
  const resultado = await _enviarRespuestaInternal(payload, io);

  // 2. Comprobar si debemos avanzar de turno (Solo en vivo)
  // Si ya estaba respondida o hubo error, _enviarRespuestaInternal ya manejó eso (o lanzó excepcion)
  if (resultado.yaRespondida) return resultado;

  try {
    const { idPartida, idPregunta } = payload;
    const partida = await Partida.findById(idPartida);

    if (partida && partida.tipoPartida === tipos.MODOS_JUEGO.EN_VIVO) {
      // Contar jugadores activos (o totales registrados)
      // Usamos partida.jugadores.length que es más seguro para consistencia
      // FIX: Solo contar los que están marcados como ACTIVO. Los ABANDONADO no responderán.
      const jugadoresActivos = partida.jugadores.filter(j => j.estado === tipos.ESTADO_USER.ACTIVO);
      const totalEsperados = jugadoresActivos.length;

      // Contar cuántos han respondido a ESTA pregunta
      const respuestasCount = await Participacion.countDocuments({
        idPartida: partida._id,
        "respuestas.idPregunta": new mongoose.Types.ObjectId(idPregunta)
      });

      console.log(`[Auto-Avance] ${respuestasCount}/${totalEsperados} respondieron.`);

      if (io) {
        io.to(partida.pin).emit('voto_recibido', {
          respondidos: respuestasCount,
          total: totalEsperados
        });
      }

      if (respuestasCount >= totalEsperados) {
        console.log('[Auto-Avance] Todos han respondido. Avanzando pregunta...');
        // Forzamos la conclusión de la pregunta actual
        // Debemos asegurarnos de que idPregunta es la actual para no liar los timers
        // indicePregunta la sacamos de partida.stats.preguntaActual
        const indicePreguntaActual = partida.stats?.preguntaActual;
        if (indicePreguntaActual === undefined) {
          console.error('[Auto-Avance] ERROR: partida.stats.preguntaActual es undefined, no se puede avanzar');
          return resultado;
        }
        console.log(`[Auto-Avance] Llamando a concluirPregunta con índice ${indicePreguntaActual}`);
        await concluirPregunta(partida._id, indicePreguntaActual, io);
      }
    }
  } catch (e) {
    console.error('Error en lógica auto-avance:', e);
  }

  return resultado;
}

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
      idAlumno: j.idAlumno,
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
const partidasProcesando = new Set();

/**
 * concluirPregunta: cierra una pregunta, calcula stats y emite por socket
 * @param {String|ObjectId} partidaId
 * @param {Number} indicePregunta
 * @param {Server} io - instancia de socket.io
 */
async function concluirPregunta(partidaId, indicePregunta, io) {
  const pId = String(partidaId);
  console.log(`[concluirPregunta] 🔵 INICIO para partida ${pId}, pregunta ${indicePregunta}`);

  // 1. Evitar doble procesamiento concurrente
  if (partidasProcesando.has(pId)) {
    console.log(`[concluirPregunta] ⛔ BLOQUEADO - Partida ${pId} ya está siendo procesada`);
    return;
  }

  // 2. Limpiar timer si existe
  if (temporizadoresPartidas[pId]) {
    clearTimeout(temporizadoresPartidas[pId]);
    delete temporizadoresPartidas[pId];
  } else {
    // Si no hay timer, asumimos recuperación tras reinicio o llamada forzada.
    console.log(`[Info] Concluyendo pregunta ${indicePregunta} de partida ${pId} (sin timer activo).`);
  }

  partidasProcesando.add(pId);

  try {
    const partida = await Partida.findById(partidaId);
    if (!partida) {
      return;
    }

    // Verificar que seguimos en la misma pregunta (evitar condiciones de carrera antiguas)
    const preguntaActualPartida = partida.stats?.preguntaActual;
    if (preguntaActualPartida !== indicePregunta) {
      console.warn(`[Warning] Intento de concluir pregunta ${indicePregunta} pero partida va por ${preguntaActualPartida}`);
      return;
    }

    const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
    if (!preguntas[indicePregunta]) {
      return;
    }

    const preguntaActual = preguntas[indicePregunta];
    const participaciones = await Participacion.find({ idPartida: partidaId });

    // ---------------------------------------------------------
    // NUEVO: Detectar jugadores que NO respondieron y actualizar su contador
    // ---------------------------------------------------------
    const respondieronIds = new Set();
    const statsPregunta = [0, 0, 0, 0];

    participaciones.forEach(p => {
      const r = p.respuestas.find(res => res.idPregunta.toString() === preguntaActual._id.toString());
      if (r) {
        respondieronIds.add(p.idAlumno); // Marcamos que este alumno respondió

        // Calcular stats solo de los que respondieron con opciones
        if (r.opcionesMarcadas.length > 0) {
          const idx = r.opcionesMarcadas[0];
          if (statsPregunta[idx] !== undefined) statsPregunta[idx]++;
        }
      }
    });

    // Actualizar 'sinResponder' en partida.jugadores
    let huboCambiosJugadores = false;
    partida.jugadores.forEach(j => {
      // Si está activo y no respondiò...
      if (j.estado === tipos.ESTADO_USER.ACTIVO && !respondieronIds.has(j.idAlumno)) {
        j.sinResponder = (j.sinResponder || 0) + 1;
        // Opcional: considerar si esto afecta puntuación total (normalmente no suma puntos)
        huboCambiosJugadores = true;
        console.log(`[Stats] Jugador ${j.idAlumno} NO respondió pregunta ${indicePregunta}. Incrementando sinResponder a ${j.sinResponder}`);
      }
    });

    if (huboCambiosJugadores) {
      partida.markModified('jugadores');
      await partida.save();
    }
    // ---------------------------------------------------------

    const indiceCorrecto = preguntaActual.opciones.findIndex(op => op.esCorrecta);

    console.log(`[concluirPregunta] 📊 Stats calculadas para pregunta ${indicePregunta}: ${JSON.stringify(statsPregunta)}`);

    if (io) {
      console.log(`[concluirPregunta] 📡 Emitiendo 'tiempo_agotado' a sala ${partida.pin}`);
      io.to(partida.pin).emit('tiempo_agotado', {
        mensaje: 'Resultados',
        stats: statsPregunta,
        correcta: indiceCorrecto,
        rankingParcial: obtenerRanking(partida.jugadores)
      });
      console.log(`[concluirPregunta] ✅ 'tiempo_agotado' emitido exitosamente`);
    }

    // Pausa y siguiente pregunta
    console.log(`[Timer] Programando siguiente pregunta en 3s para partida ${pId}`);
    setTimeout(() => {
      console.log(`[Timer] Ejecutando timeout para siguiente pregunta partida ${pId}`);
      gestionarCicloPregunta(partida, indicePregunta + 1, io)
        .then(() => console.log(`[Ciclo] gestionarCicloPregunta completado para ${pId}`))
        .catch(err => console.error('[Error] Fallo en ciclo pregunta:', err));
    }, 3000);

  } catch (error) {
    console.error('Error en concluirPregunta:', error);
  } finally {
    // Liberar el semáforo SIEMPRE, incluso si hay error o return temprano
    console.log(`[Lock] Liberando lock para ${pId}`);
    partidasProcesando.delete(pId);
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
  console.log(`[Ciclo] Iniciando gestión pregunta index ${indicePregunta} para partida ${pId}`);

  // limpieza defensiva del timer anterior
  if (temporizadoresPartidas[pId]) {
    clearTimeout(temporizadoresPartidas[pId]);
    delete temporizadoresPartidas[pId];
  }

  const preguntas = await Pregunta.find({ idCuestionario: partidaDoc.idCuestionario }).sort({ ordenPregunta: 1 });

  // fin del juego
  if (indicePregunta >= preguntas.length) {
    console.log(`[Ciclo] Fin de partida detectado (index ${indicePregunta} >= ${preguntas.length})`);
    await cerrarPartidaLogic(partidaDoc, io);
    return;
  }

  console.log(`[Ciclo] Actualizando BD: stats.preguntaActual = ${indicePregunta}`);
  await Partida.findByIdAndUpdate(partidaDoc._id, { 'stats.preguntaActual': indicePregunta });
  console.log(`[Ciclo] ✅ BD actualizada exitosamente`);
  partidaDoc.stats = partidaDoc.stats || {};
  partidaDoc.stats.preguntaActual = indicePregunta;

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
    opciones: preguntaActual.opciones.map((op, idx) => ({
      idOpcion: op._id ? String(op._id) : String(idx),
      textoOpcion: op.textoOpcion
    }))
  };

  if (io) {
    io.to(partidaDoc.pin).emit('nueva_pregunta', datosPregunta);
  }

  // programar cierre por tiempo
  console.log(`[Timer] ⏰ Programando timer para partida ${pId}, pregunta ${indicePregunta}, en ${tiempo} segundos`);
  const timeoutId = setTimeout(() => {
    console.log(`[Timer] ⏰⏰ TIMEOUT EJECUTADO para partida ${pId}, pregunta ${indicePregunta}`);
    concluirPregunta(partidaDoc._id, indicePregunta, io).catch(e => console.error('[Timer] Error en concluirPregunta:', e));
  }, tiempo * 1000);

  temporizadoresPartidas[pId] = timeoutId;
  console.log(`[Timer] Timer ID ${timeoutId} guardado para partida ${pId}`);
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
  if (!partida.fechas) partida.fechas = {};
  partida.fechas.finalizadaEn = new Date();

  // Si es EXAMEN, recalculamos notas finales sobre 10
  if (partida.tipoPartida !== tipos.MODOS_JUEGO.EN_VIVO) {
    const totalPreguntas = await Pregunta.countDocuments({ idCuestionario: partida.idCuestionario });
    const participaciones = await Participacion.find({ idPartida: partida._id });

    for (const p of participaciones) {
      const aciertos = p.aciertos || 0;
      const nota = totalPreguntas > 0 ? (aciertos / totalPreguntas) * 10 : 0;
      p.puntuacionTotal = Math.round(nota * 10) / 10;
      p.estado = 'finalizada';
      p.finEn = Date.now();
      await p.save();

      // Sincronizar con partida.jugadores
      const jIdx = partida.jugadores.findIndex(j => j.idAlumno === p.idAlumno);
      if (jIdx !== -1) {
        partida.jugadores[jIdx].puntuacionTotal = p.puntuacionTotal;
        // No cambiamos estado del user a 'finalizado' ya que no está en el enum
        // partida.jugadores[jIdx].estado = 'finalizado'; 
      }
    }
    partida.markModified('jugadores');
  } else {
    // En Vivo: Solo marcamos como finalizadas
    await Participacion.updateMany(
      { idPartida: partida._id },
      { $set: { estado: 'finalizada', finEn: Date.now() } }
    );
  }

  await partida.save();

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
 * Verifica que el profesor exista en la BD mediante su idPortal
 */
async function crearPartida(data) {
  const { nombrePartida, asignatura, curso, idCuestionario, idProfesor, modoAcceso, participantesPermitidos, tipoPartida, configuracionEnvivo, configuracionExamen, fechas } = data;

  // Verificar que el profesor existe en la BD
  const profesor = await Usuario.findOne({ idPortal: idProfesor });
  if (!profesor) throw new Error('Profesor no encontrado en el sistema');
  if (profesor.rol !== 'profesor') throw new Error('El usuario no tiene rol de profesor');

  const cuestionarioPadre = await Cuestionario.findById(idCuestionario);
  if (!cuestionarioPadre) throw new Error('Cuestionario no encontrado');

  const nuevaPartida = new Partida({
    nombrePartida,
    asignatura,
    curso,
    idCuestionario,
    idProfesor,
    pin: generarPinUnico(),
    tipoPartida: tipoPartida || tipos.MODOS_JUEGO.EN_VIVO,
    modoAcceso: modoAcceso || tipos.TIPO_LOBBY.PUBLICA,
    participantesPermitidos: participantesPermitidos || [],
    configuracionEnvivo: configuracionEnvivo || {},
    configuracionExamen: configuracionExamen || {},
    fechas: fechas || {},
    estadoPartida: tipos.ESTADOS_PARTIDA.ESPERA
  });

  await nuevaPartida.save();
  return { id: nuevaPartida._id, pin: nuevaPartida.pin, _id: nuevaPartida._id };
}

/**
 * unirseAPartida(pin, idAlumno, io)
 * El idAlumno corresponde al idPortal del usuario.
 * El nombre se obtiene automáticamente de la BD.
 */
async function unirseAPartida(pin, idAlumno, nombreAlumnoParam, io) {
  // Verificar que el alumno existe en la BD mediante su idPortal
  const alumno = await Usuario.findOne({ idPortal: idAlumno });
  if (!alumno) throw new Error('Usuario no encontrado en el sistema');

  // Construir nombre completo desde la BD (ignoramos nombreAlumnoParam para compatibilidad)
  const nombreAlumno = alumno.nombre;

  const partida = await Partida.findOne({ pin, estadoPartida: { $ne: tipos.ESTADOS_PARTIDA.FINALIZADA } });
  if (!partida) throw new Error('Partida no encontrada');

  // Validación de Lobby Privado
  if (partida.modoAcceso === tipos.TIPO_LOBBY.PRIVADA) {
    if (!partida.participantesPermitidos || !partida.participantesPermitidos.includes(idAlumno)) {
      throw new Error('No tienes permiso para unirte a esta partida privada');
    }
  }

  const jugadorExiste = partida.jugadores.some(j => j.idAlumno === idAlumno);
  if (!jugadorExiste) {
    partida.jugadores.push({ idAlumno, nombreAlumno, estado: tipos.ESTADOS_PARTIDA.ACTIVA });
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
    configuracion: partida.tipoPartida === 'en_vivo' ? partida.configuracionEnvivo : partida.configuracionProgramada,
    nombreAlumno: nombreAlumno
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
    // Buscar la primera pregunta para devolverla al monitor
    const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
    const tiempo = partida.configuracionEnvivo?.tiempoPorPreguntaSeg || preguntas[0]?.tiempoLimiteSeg || 20;

    const primeraPregunta = preguntas[0] ? {
      idPregunta: preguntas[0]._id,
      textoPregunta: preguntas[0].textoPregunta,
      tipoPregunta: preguntas[0].tipoPregunta,
      tiempoLimite: tiempo,
      puntos: preguntas[0].puntuacionMax,
      numeroPregunta: 1,
      totalPreguntas: preguntas.length,
      opciones: preguntas[0].opciones.map((op, idx) => ({
        idOpcion: op._id ? String(op._id) : String(idx),
        textoOpcion: op.textoOpcion
      }))
    } : null;

    // lanzar ciclo
    gestionarCicloPregunta(partida, 0, io).catch(e => console.error(e));
    return { mensaje: 'Iniciada', primeraPregunta };
  }
  else {
    // MODO EXAMEN: Notificar inicio
    const duracionMin = partida.configuracionExamen?.tiempoTotalMin || 20;
    io.to(partida.pin).emit('inicio_examen', {
      mensaje: 'Examen iniciado',
      horaInicio: partida.inicioEn,
      duracionMin: duracionMin,
      totalJugadores: partida.jugadores.length
    });

    // Programar cierre automático de seguridad (+1 minuto de margen)
    const tiempoTotalMs = (duracionMin * 60 * 1000) + 60000;
    console.log(`[Examen] Cierre automático programado en ${duracionMin} min (+1 min margen)`);

    temporizadoresPartidas[String(partida._id)] = setTimeout(async () => {
      try {
        console.log(`[Examen] Tiempo agotado por servidor. Cerrando partida ${partida._id}...`);
        const pActualizada = await Partida.findById(id);
        if (pActualizada && pActualizada.estadoPartida !== tipos.ESTADOS_PARTIDA.FINALIZADA) {
          await cerrarPartidaLogic(pActualizada, io);
        }
      } catch (e) {
        console.error("Error en cierre automático de examen:", e);
      }
    }, tiempoTotalMs);

    return { mensaje: 'Examen iniciado' };
  }
}

/* --------------------- CRUD Y CONSULTAS --------------------- */

async function obtenerTodasPartidas(filtro = {}) {
  const partidas = await Partida.find(filtro).populate('idCuestionario', 'titulo asignatura curso').sort({ inicioEn: -1 });
  return partidas;
}

async function obtenerDetallePartida(id) {
  const partida = await Partida.findById(id).populate('idCuestionario').lean();
  if (!partida) return null;

  // Obtener las preguntas asociadas al cuestionario
  const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario._id })
    .sort({ ordenPregunta: 1 }) // Importante mantener el orden
    .lean();

  // Obtener las participaciones para enriquecer los jugadores con sus respuestas
  // Usar partida._id que es un ObjectId válido
  const participaciones = await Participacion.find({ idPartida: partida._id }).lean();

  // Enriquecer los jugadores con las respuestas de las participaciones
  const jugadoresEnriquecidos = partida.jugadores.map(jugador => {
    const participacion = participaciones.find(p => p.idAlumno === jugador.idAlumno);
    return {
      ...jugador,
      respuestas: participacion?.respuestas || [],
      aciertos: participacion?.aciertos || 0,
      puntuacionTotal: participacion?.puntuacionTotal || jugador.puntuacionTotal || 0
    };
  });

  return { ...partida, jugadores: jugadoresEnriquecidos, preguntas };
}

async function actualizarPartida(id, payload) {
  return await Partida.findByIdAndUpdate(id, payload, { new: true });

  const partida = await Partida.findById(id);

  if (!partida) {
    throw new Error('Partida no encontrada');
  }

  // 2. VALIDACIÓN: Bloquear edición si la partida NO está en espera
  if (partida.estadoPartida !== tipos.ESTADOS_PARTIDA.ESPERA) {
    throw new Error('No se puede editar la configuración: La partida ya ha comenzado o finalizado.');
  }

  // 3. ACTUALIZACIÓN SEGURA DE CAMPOS

  // A) Datos generales
  if (payload.modoAcceso) partida.modoAcceso = payload.modoAcceso;
  if (payload.participantesPermitidos) partida.participantesPermitidos = payload.participantesPermitidos;

  // B) Configuración EN VIVO 
  if (payload.configuracionEnvivo) {//Solo entramos aquí si el usuario envió cambios para esta sección. Si no envió nada, no tocamos lo que ya existe.
    // Convertimos a objeto plano si es necesario para evitar conflictos de Mongoose
    const currentConfig = partida.configuracionEnvivo ? JSON.parse(JSON.stringify(partida.configuracionEnvivo)) : {};//Los objetos que vienen de la base de datos (Mongoose) a veces tienen "basura" oculta (métodos internos, getters, setters). Para poder evitar la "basura"

    partida.configuracionEnvivo = {
      ...currentConfig, // 1. COPIA todo lo que ya tenías guardado
      ...payload.configuracionEnvivo// 2. SOBRESCRIBE solo lo que viene nuevo
    };
  }

  // C) Configuración PROGRAMADA 
  if (payload.configuracionProgramada) {
    const currentConfig = partida.configuracionProgramada ? JSON.parse(JSON.stringify(partida.configuracionProgramada)) : {};

    partida.configuracionProgramada = {
      ...currentConfig,
      ...payload.configuracionProgramada
    };
  }

  // D) Fechas
  if (payload.fechas) {
    partida.fechas = {
      ...partida.fechas,
      ...payload.fechas
    };
  }

  // 4. Guardar cambios
  await partida.save();
  return partida;
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
  const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 }).lean();

  // Sanitizar para no enviar respuestas correctas al cliente
  return preguntas.map(p => ({
    _id: p._id,
    textoPregunta: p.textoPregunta,
    tipoPregunta: p.tipoPregunta,
    opciones: p.opciones.map(o => ({
      textoOpcion: o.textoOpcion,
      _id: o._id
    }))
  }));
}

async function finalizarExamenAlumno(idPartida, idAlumno, io) {
  const partida = await Partida.findById(idPartida);
  if (!partida) throw new Error('Partida no encontrada');

  // Recuperamos la participacion
  const participacion = await Participacion.findOne({ idPartida, idAlumno });
  if (!participacion) throw new Error('Participación no encontrada');

  // Si ya está finalizada, no hacer nada
  if (participacion.estado === 'finalizada') {
    return { nota: participacion.puntuacionTotal, yaFinalizada: true };
  }

  // Calcular score base 10
  // Necesitamos el total de preguntas del cuestionario
  const totalPreguntas = await Pregunta.countDocuments({ idCuestionario: partida.idCuestionario });

  let aciertos = 0;
  if (participacion.respuestas) {
    participacion.respuestas.forEach(r => {
      // Buscamos la pregunta para saber si es correcta (si no lo guardamos en r.esCorrecta)
      // Asumimos que r.esCorrecta ya se calculó en enviarRespuesta
      if (r.esCorrecta) aciertos++;
    });
  }

  const nota = totalPreguntas > 0 ? (aciertos / totalPreguntas) * 10 : 0;
  const notaRedondeada = Math.round(nota * 10) / 10;

  // Actualizar Participacion
  participacion.puntuacionTotal = notaRedondeada;
  participacion.estado = 'finalizada';
  participacion.finEn = Date.now();
  await participacion.save();

  // Actualizar Partida.jugadores
  const jugador = partida.jugadores.find(j => j.idAlumno === idAlumno);
  if (jugador) {
    jugador.puntuacionTotal = notaRedondeada;
    jugador.estado = tipos.ESTADOS_PARTIDA.FINALIZADA;
    jugador.finEn = Date.now();
    partida.markModified('jugadores');
    await partida.save();
  }

  // Emitir evento de que el alumno finalizó (para el monitor del profe)
  if (io) {
    io.to(partida.pin).emit('alumno_finalizado', {
      idAlumno: idAlumno,
      nota: notaRedondeada,
      nombre: jugador ? jugador.nombreAlumno : 'Alumno'
    });
  }

  // Verificar si TODOS los alumnos han finalizado
  const totalJugadores = partida.jugadores.length;
  const participacionesFinalizadas = await Participacion.countDocuments({
    idPartida,
    estado: 'finalizada'
  });

  console.log(`[Examen] Alumno ${idAlumno} finalizó. ${participacionesFinalizadas}/${totalJugadores} han terminado.`);

  // Si todos han finalizado, cerrar la partida automáticamente
  if (participacionesFinalizadas >= totalJugadores && partida.estadoPartida !== tipos.ESTADOS_PARTIDA.FINALIZADA) {
    console.log(`[Examen] Todos los alumnos han finalizado. Cerrando partida automáticamente.`);
    await cerrarPartidaLogic(partida, io);
  }

  return { nota: notaRedondeada, aciertos, total: totalPreguntas };
}

async function finalizarPartida(id, io) {
  const partida = await Partida.findById(id);
  if (!partida) throw new Error('Partida no encontrada');
  await cerrarPartidaLogic(partida, io);
  return;
}

async function obtenerOpcionesConfiguracion() {
  return {
    modosJuego: Object.values(tipos.MODOS_JUEGO),
    tiposAcceso: Object.values(tipos.TIPO_LOBBY),
    modosCalificacion: tipos.OPCIONES_CALIFICACION,
    defaults: {
      enVivo: tipos.DEFAULTS.EN_VIVO,
      programada: tipos.DEFAULTS.PROGRAMADA
    },
    asignaturas: tipos.ASIGNATURAS
  };
}

async function obtenerPartidasPendientesAlumno(idAlumno) {
  const alumno = await Usuario.findOne({ idPortal: idAlumno });
  if (!alumno) throw new Error('Alumno no encontrado');

  // Buscar partidas en estado 'espera' (lobby abierto)
  const partidas = await Partida.find({
    estadoPartida: { $in: [tipos.ESTADOS_PARTIDA.ESPERA] }
  })
    .populate('idCuestionario')
    .sort({ 'fechas.creadaEn': -1 });

  // Filtrar por curso del alumno
  const cursoAlumno = (alumno.curso || '').trim().toLowerCase();

  const filtradas = partidas.filter(p => {
    const q = p.idCuestionario;
    if (!q) return false;
    // Si el cuestionario tiene curso, debe coincidir. Si no tiene, ¿se muestra a todos? Asumamos que sí o no.
    // El usuario quiere "datos que existan para el curso". Si curso está vacío, tal vez es general.
    // Vamos a ser estrictos: debe coincidir el curso, O el cuestionario ser "General"
    const cursoQ = (q.curso || '').trim().toLowerCase();

    // Filtro por Lobby Privado: si es privada, el alumno debe estar en participantesPermitidos
    if (p.modoAcceso === tipos.TIPO_LOBBY.PRIVADA) {
      if (!p.participantesPermitidos || !p.participantesPermitidos.includes(idAlumno)) {
        return false;
      }
    }

    if (!cursoQ) return true; // Cuestionario sin curso específico -> visible
    return cursoQ === cursoAlumno;
  });

  return filtradas.map(p => {
    let fechaMostrar = p.fechas?.creadaEn;
    if (p.tipoPartida === 'examen' && p.configuracionExamen?.programadaPara) {
      fechaMostrar = p.configuracionExamen.programadaPara;
    }

    return {
      _id: String(p._id),
      nombrePartida: p.nombrePartida,
      pin: p.pin,
      idCuestionario: {
        _id: String(p.idCuestionario._id),
        titulo: p.idCuestionario.titulo,
        descripcion: p.idCuestionario.descripcion || '',
        curso: p.idCuestionario.curso || '',
        asignatura: p.idCuestionario.asignatura || ''
      },
      curso: p.curso || p.idCuestionario?.curso || '',
      asignatura: p.asignatura || p.idCuestionario?.asignatura || '',
      fechaProgramada: fechaMostrar,
      estado: p.estadoPartida,
      tipo: p.tipoPartida
    };
  });
}

/* --------------------- EXPORTS --------------------- */
module.exports = {
  obtenerOpcionesConfiguracion,
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
  finalizarPartida,
  finalizarExamenAlumno,
  obtenerPartidasPendientesAlumno
};