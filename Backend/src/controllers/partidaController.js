// Controller refactorizado: ahora delega a src/services/partidaService.js
const partidaService = require('../services/partidaService');

exports.crearPartida = async (req, res) => {
  try {
    const result = await partidaService.crearPartida(req.body);
    res.status(201).json({ ok: true, mensaje: 'Partida creada', data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.unirseAPartida = async (req, res) => {
  const { pin } = req.params;
  const { idAlumno, nombreAlumno } = req.body;
  const io = req.app.get('socketio');

  try {
    const data = await partidaService.unirseAPartida(pin, idAlumno, nombreAlumno, io);
    res.json({ ok: true, mensaje: 'Unido', data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, mensaje: error.message === 'Partida no encontrada' ? 'Partida no encontrada.' : undefined });
  }
};

exports.iniciarPartida = async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('socketio');

  try {
    const data = await partidaService.iniciarPartida(id, io);
    res.json({ ok: true, ...data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.enviarRespuesta = async (req, res) => {
  const payload = req.body;
  const io = req.app.get('socketio');

  try {
    const result = await partidaService.enviarRespuesta(payload, io);
    if (result.yaRespondida) return res.status(400).json({ ok: false, mensaje: 'Ya respondida' });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.obtenerTodasPartidas = async (req, res) => {
  try {
    const { idProfesor, estado } = req.query;
    let filtro = {};
    if (idProfesor) filtro.idProfesor = idProfesor;
    if (estado) filtro.estadoPartida = estado;
    const partidas = await partidaService.obtenerTodasPartidas(filtro);
    res.json({ ok: true, total: partidas.length, data: partidas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.obtenerDetallePartida = async (req, res) => {
  try {
    const partida = await partidaService.obtenerDetallePartida(req.params.id);
    if (!partida) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: partida });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.actualizarPartida = async (req, res) => {
  try {
    const partida = await partidaService.actualizarPartida(req.params.id, req.body);
    res.json({ ok: true, data: partida });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.eliminarPartida = async (req, res) => {
  try {
    await partidaService.eliminarPartida(req.params.id);
    res.json({ ok: true, mensaje: 'Eliminada' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.obtenerPartidaPorPin = async (req, res) => {
  try {
    const partida = await partidaService.obtenerPartidaPorPin(req.params.pin);
    if (!partida) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: partida });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.obtenerPreguntasExamen = async (req, res) => {
  try {
    const preguntas = await partidaService.obtenerPreguntasExamen(req.params.idPartida);
    res.json({ ok: true, data: preguntas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

exports.finalizarPartida = async (req, res) => {
  try {
    const io = req.app.get('socketio');
    await partidaService.finalizarPartida(req.params.id, io);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};