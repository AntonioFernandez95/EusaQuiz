// Servicio: src/services/cuestionarioService.js
// Centraliza la lógica de negocio relativa a Cuestionarios:
// - Creación, lectura, actualización, eliminación
// - Actualización de contadores (numPreguntas, numVecesJugado)
// - Búsquedas y validaciones básicas
//
// El servicio lanza errores con la propiedad `status` (httpError) para
// facilitar el manejo en controllers y middlewares.

const Cuestionario = require('../models/cuestionario');
const mongoose = require('mongoose');

/**
 * Crea un Error con código HTTP (status) para que el controller lo mapee fácilmente.
 * @param {number} status HTTP status code
 * @param {string} message Mensaje de error
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Crear un nuevo cuestionario.
 * Se asume que la validación más detallada la hace Mongoose (schema).
 * @param {Object} data Todos los campos del cuestionario (idProfesor, centro, titulo, etc.)
 * @returns {Object} documento guardado
 */
async function crearCuestionario(data) {
  // Podemos validar campos obligatorios aquí si es necesario, ejemplo:
  // if (!data.idProfesor) throw httpError(400, 'idProfesor es requerido.');

  const nuevoQuiz = new Cuestionario(data);
  const quizGuardado = await nuevoQuiz.save();
  return quizGuardado;
}

/**
 * Obtener todos los cuestionarios de un profesor específico.
 * @param {string} idProfesor
 * @returns {Array} lista de cuestionarios
 */
async function obtenerMisCuestionarios(idProfesor) {
  if (!idProfesor) throw httpError(400, 'idProfesor es requerido.');

  // No validamos ObjectId estrictamente para permitir cadenas externas,
  // pero se puede añadir validación con mongoose.Types.ObjectId.isValid.
  const quizzes = await Cuestionario.find({ idProfesor });
  return quizzes;
}

/**
 * Obtener un cuestionario por su ID.
 * @param {string} id
 * @returns {Object} cuestionario
 */
async function obtenerPorId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const quiz = await Cuestionario.findById(id);
  if (!quiz) throw httpError(404, 'Cuestionario no encontrado.');
  return quiz;
}

/**
 * Actualizar contadores del cuestionario (numPreguntas, numVecesJugado) usando $inc.
 * Se permite pasar valores positivos o negativos (ej: 1 o -1).
 * @param {string} id ID del cuestionario
 * @param {Object} payload { numPreguntas, numVecesJugado }
 * @returns {Object} cuestionario actualizado
 */
async function actualizarContadoresCuestionario(id, payload) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const { numPreguntas, numVecesJugado } = payload || {};
  const inc = {};

  if (numPreguntas !== undefined) {
    if (typeof numPreguntas !== 'number') throw httpError(400, 'numPreguntas debe ser un número.');
    inc.numPreguntas = numPreguntas;
  }
  if (numVecesJugado !== undefined) {
    if (typeof numVecesJugado !== 'number') throw httpError(400, 'numVecesJugado debe ser un número.');
    inc.numVecesJugado = numVecesJugado;
  }

  if (Object.keys(inc).length === 0) {
    throw httpError(400, 'No se proporcionaron campos para actualizar los contadores.');
  }

  // Actualizamos con $inc y actualizamos la fecha de modificación
  const actualizado = await Cuestionario.findByIdAndUpdate(
    id,
    { $inc: inc, actualizadoEn: Date.now() },
    { new: true }
  );

  if (!actualizado) throw httpError(404, 'Cuestionario no encontrado.');
  return actualizado;
}

/**
 * Obtener todos los cuestionarios con filtros simples.
 * @param {Object} filters { asignatura, busqueda }
 * @returns {Array} lista de cuestionarios
 */
async function obtenerTodos(filters = {}) {
  const { asignatura, busqueda } = filters;
  const filtro = {};

  if (asignatura) filtro.asignatura = asignatura;
  if (busqueda) filtro.titulo = { $regex: busqueda, $options: 'i' };

  const cuestionarios = await Cuestionario.find(filtro).sort({ creadoEn: -1 });
  return cuestionarios;
}

/**
 * Actualizar un cuestionario (edición de campos).
 * Añadimos actualizadoEn automáticamente.
 * @param {string} id
 * @param {Object} datosActualizar
 * @returns {Object} cuestionario actualizado
 */
async function actualizarCuestionario(id, datosActualizar) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const actualizado = await Cuestionario.findByIdAndUpdate(
    id,
    { ...datosActualizar, actualizadoEn: Date.now() },
    { new: true }
  );

  if (!actualizado) throw httpError(404, 'Cuestionario no encontrado.');
  return actualizado;
}

/**
 * Eliminar un cuestionario por ID.
 * @param {string} id
 * @returns {Object} documento eliminado
 */
async function eliminarCuestionario(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(400, 'ID inválido.');
  }

  const eliminado = await Cuestionario.findByIdAndDelete(id);
  if (!eliminado) throw httpError(404, 'Cuestionario no encontrado.');
  return eliminado;
}

// Exportar las funciones del service
module.exports = {
  crearCuestionario,
  obtenerMisCuestionarios,
  obtenerPorId,
  actualizarContadoresCuestionario,
  obtenerTodos,
  actualizarCuestionario,
  eliminarCuestionario
};