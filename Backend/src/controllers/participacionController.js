// src/controllers/participacionController.js (refactorizado)
// Controller delgado: delega la lógica al service (src/services/participacionService.js).
// Responsable únicamente de transformar req/res y mapear errores HTTP.

const participacionService = require('../services/participacionService');

/**
 * Helper para enviar errores HTTP uniformes desde controllers.
 * Si el error contiene `status`, lo usamos; en otro caso devolvemos 500.
 */
const sendError = (res, err) => {
  const status = err && err.status ? err.status : 500;
  return res.status(status).json({ ok: false, error: err.message || 'Error interno del servidor' });
};

/**
 * 1. Responder una pregunta (núcleo del juego)
 * Body: { idPartida, idAlumno, idPregunta, opcionesMarcadas, tiempoEmpleado }
 */
exports.enviarRespuesta = async (req, res) => {
  const payload = req.body;
  const io = req.app.get('socketio');

  try {
    const result = await participacionService.enviarRespuesta(payload, io);

    // Si el service indica que ya se había respondido en modo en_vivo,
    // devolvemos 400 para seguir la semántica anterior.
    if (result && result.yaRespondida) {
      return res.status(400).json({ ok: false, mensaje: 'Ya respondiste a esta pregunta.' });
    }

    return res.json({ ok: true, mensaje: 'Respuesta registrada', data: result });
  } catch (err) {
    return sendError(res, err);
  }
};

/**
 * 2. Obtener mi progreso (para el alumno)
 * Params: /:idPartida/:idAlumno
 */
exports.obtenerMiProgreso = async (req, res) => {
  try {
    const { idPartida, idAlumno } = req.params;
    const participacion = await participacionService.obtenerMiProgreso(idPartida, idAlumno);
    res.json({ ok: true, data: participacion });
  } catch (err) {
    return sendError(res, err);
  }
};

/**
 * 3. Obtener ranking de la partida (para el profesor)
 * Params: /:idPartida
 */
exports.obtenerRankingPartida = async (req, res) => {
  try {
    const { idPartida } = req.params;
    const ranking = await participacionService.obtenerRankingPartida(idPartida, 10);
    res.json({ ok: true, data: ranking });
  } catch (err) {
    return sendError(res, err);
  }
};