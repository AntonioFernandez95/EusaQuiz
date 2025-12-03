// Controller refactorizado: delega la lógica al service (src/services/cuestionarioService.js)
// Mantiene la misma API pública para no romper el frontend.
// Incluye comentarios y manejo de errores consistente.

const cuestionarioService = require('../services/cuestionarioService');

/**
 * sendError: helper para enviar errores HTTP uniformes desde controllers.
 * Si el error contiene `status`, lo usamos; en otro caso devolvemos 500.
 */
const sendError = (res, err) => {
  const status = err && err.status ? err.status : 500;
  return res.status(status).json({ ok: false, error: err.message || 'Error interno del servidor' });
};

/**
 * 1. Crear un nuevo Cuestionario
 * Recibe todo el objeto del cuestionario en req.body.
 */
exports.crearCuestionario = async (req, res) => {
  try {
    const quizGuardado = await cuestionarioService.crearCuestionario(req.body);
    res.status(201).json({
      ok: true,
      mensaje: 'Cuestionario creado con éxito',
      data: quizGuardado
    });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 2. Obtener cuestionarios de un profesor específico
 * Parámetro: req.params.idProfesor
 */
exports.obtenerMisCuestionarios = async (req, res) => {
  try {
    const { idProfesor } = req.params;
    const quizzes = await cuestionarioService.obtenerMisCuestionarios(idProfesor);
    res.json({ ok: true, total: quizzes.length, data: quizzes });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 3. Obtener un cuestionario por ID
 * Parámetro: req.params.id
 */
exports.obtenerPorId = async (req, res) => {
  try {
    const quiz = await cuestionarioService.obtenerPorId(req.params.id);
    res.json({ ok: true, data: quiz });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 4. Actualizar contadores (numPreguntas, numVecesJugado)
 * Body: { numPreguntas?, numVecesJugado? }
 */
exports.actualizarContadoresCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await cuestionarioService.actualizarContadoresCuestionario(id, req.body);
    res.json({ ok: true, mensaje: 'Contadores actualizados con éxito.', data: actualizado });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 5. Obtener TODOS los cuestionarios (filtros opcionales por query string)
 * Query params: asignatura, busqueda
 */
exports.obtenerTodos = async (req, res) => {
  try {
    const filtros = { asignatura: req.query.asignatura, busqueda: req.query.busqueda };
    const cuestionarios = await cuestionarioService.obtenerTodos(filtros);
    res.json({ ok: true, total: cuestionarios.length, data: cuestionarios });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 6. Actualizar (Editar) un Cuestionario
 * Parámetro: req.params.id
 * Body: campos a actualizar
 */
exports.actualizarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const cuestionarioActualizado = await cuestionarioService.actualizarCuestionario(id, req.body);
    res.json({
      ok: true,
      mensaje: 'Cuestionario actualizado correctamente',
      data: cuestionarioActualizado
    });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * 7. Eliminar un Cuestionario
 * Parámetro: req.params.id
 */
exports.eliminarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const cuestionarioEliminado = await cuestionarioService.eliminarCuestionario(id);
    res.json({
      ok: true,
      mensaje: 'Cuestionario eliminado permanentemente',
      data: { id: cuestionarioEliminado._id, titulo: cuestionarioEliminado.titulo }
    });
  } catch (err) {
    sendError(res, err);
  }
};