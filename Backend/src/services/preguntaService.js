// Servicio para Preguntas: concentra la lógica de creación/lectura/actualización/eliminación
// y la actualización del contador del Cuestionario padre.
//
// Nota: Lanzo errores con la propiedad `status` para que el controller responda con el código HTTP apropiado.

const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
const mongoose = require('mongoose');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * crearPregunta(data)
 * data: { idCuestionario, ...preguntaData }
 */
async function crearPregunta(data) {
  const { idCuestionario, ...preguntaData } = data;

  if (!idCuestionario || !mongoose.Types.ObjectId.isValid(idCuestionario)) {
    throw httpError(400, 'ID de Cuestionario inválido.');
  }

  const cuestionario = await Cuestionario.findById(idCuestionario);
  if (!cuestionario) {
    throw httpError(404, 'Cuestionario no encontrado.');
  }

  const nuevaPregunta = new Pregunta({ idCuestionario, ...preguntaData });
  const preguntaGuardada = await nuevaPregunta.save();

  // Actualizar contador y fecha del cuestionario
  await Cuestionario.findByIdAndUpdate(idCuestionario, {
    $inc: { numPreguntas: 1 },
    actualizadoEn: Date.now()
  });

  return preguntaGuardada;
}

async function obtenerPreguntasPorCuestionario(idCuestionario) {
  if (!idCuestionario || !mongoose.Types.ObjectId.isValid(idCuestionario)) {
    throw httpError(400, 'ID de Cuestionario inválido.');
  }

  const preguntas = await Pregunta.find({ idCuestionario }).sort({ ordenPregunta: 1 });
  return preguntas;
}

async function obtenerPreguntaPorId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const pregunta = await Pregunta.findById(id);
  if (!pregunta) throw httpError(404, 'Pregunta no encontrada.');
  return pregunta;
}

async function actualizarPregunta(id, datosActualizar) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const preguntaActualizada = await Pregunta.findByIdAndUpdate(id, datosActualizar, { new: true });
  if (!preguntaActualizada) throw httpError(404, 'Pregunta no encontrada.');

  // Actualizar fecha de modificación del cuestionario padre (si existe)
  if (preguntaActualizada.idCuestionario) {
    await Cuestionario.findByIdAndUpdate(preguntaActualizada.idCuestionario, {
      actualizadoEn: Date.now()
    });
  }

  return preguntaActualizada;
}

async function eliminarPregunta(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const preguntaEliminada = await Pregunta.findByIdAndDelete(id);
  if (!preguntaEliminada) throw httpError(404, 'Pregunta no encontrada.');

  // Decrementar contador en el Cuestionario padre
  if (preguntaEliminada.idCuestionario) {
    await Cuestionario.findByIdAndUpdate(preguntaEliminada.idCuestionario, {
      $inc: { numPreguntas: -1 },
      actualizadoEn: Date.now()
    });
  }

  return preguntaEliminada;
}

module.exports = {
  crearPregunta,
  obtenerPreguntasPorCuestionario,
  obtenerPreguntaPorId,
  actualizarPregunta,
  eliminarPregunta
};