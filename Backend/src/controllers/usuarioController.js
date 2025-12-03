/**
 * Ejemplo de controlador esperado por las rutas.
 * Si ya tienes tu controlador con lógica real, revisa que exporte
 * funciones con estos nombres (listarUsuarios, obtenerUsuario, crearUsuario, actualizarUsuario, borrarUsuario)
 * o bien que tenga aliases compatibles (index, getAll, getById, create, update, delete).
 *
 * Si ya tienes tu implementación real, no sobrescribas este archivo;
 * en su lugar adapta usuarioRoutes.js para usar los nombres que exporta tu controller.
 */

const Usuario = require('../models/usuario'); // ajusta si tu modelo está en otra ruta

async function listarUsuarios(req, res) {
  const usuarios = await Usuario.find().limit(100);
  return res.json({ ok: true, data: usuarios });
}

async function obtenerUsuario(req, res) {
  const id = req.params.id;
  const u = await Usuario.findById(id);
  if (!u) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
  return res.json({ ok: true, data: u });
}

async function crearUsuario(req, res) {
  const payload = req.body;
  const u = new Usuario(payload);
  await u.save();
  return res.status(201).json({ ok: true, data: u });
}

async function actualizarUsuario(req, res) {
  const id = req.params.id;
  const payload = req.body;
  const u = await Usuario.findByIdAndUpdate(id, payload, { new: true });
  if (!u) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
  return res.json({ ok: true, data: u });
}

async function borrarUsuario(req, res) {
  const id = req.params.id;
  await Usuario.findByIdAndDelete(id);
  return res.json({ ok: true, mensaje: 'Usuario eliminado' });
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  borrarUsuario
};