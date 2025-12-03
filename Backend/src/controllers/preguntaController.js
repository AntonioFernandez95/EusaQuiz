// Controller refactorizado: delega en src/services/preguntaService.js
const preguntaService = require('../services/preguntaService');

const sendError = (res, err) => {
  const status = err && err.status ? err.status : 500;
  const payload = { ok: false, error: err.message || 'Error interno' };
  return res.status(status).json(payload);
};

exports.crearPregunta = async (req, res) => {
  try {
    const pregunta = await preguntaService.crearPregunta(req.body);
    res.status(201).json({ ok: true, mensaje: 'Pregunta creada y vinculada con éxito.', data: pregunta });
  } catch (err) {
    sendError(res, err);
  }
};

exports.obtenerPreguntasPorCuestionario = async (req, res) => {
  try {
    const { idCuestionario } = req.params;
    const preguntas = await preguntaService.obtenerPreguntasPorCuestionario(idCuestionario);
    res.json({ ok: true, total: preguntas.length, data: preguntas });
  } catch (err) {
    sendError(res, err);
  }
};

exports.obtenerPreguntaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const pregunta = await preguntaService.obtenerPreguntaPorId(id);
    res.json({ ok: true, data: pregunta });
  } catch (err) {
    sendError(res, err);
  }
};

exports.actualizarPregunta = async (req, res) => {
  try {
    const { id } = req.params;
    const preguntaActualizada = await preguntaService.actualizarPregunta(id, req.body);
    res.json({ ok: true, mensaje: 'Pregunta actualizada correctamente', data: preguntaActualizada });
  } catch (err) {
    sendError(res, err);
  }
};

exports.eliminarPregunta = async (req, res) => {
  try {
    const { id } = req.params;
    const preguntaEliminada = await preguntaService.eliminarPregunta(id);
    res.json({
      ok: true,
      mensaje: 'Pregunta eliminada y contador actualizado.',
      data: { id: preguntaEliminada._id }
    });
  } catch (err) {
    sendError(res, err);
  }
};