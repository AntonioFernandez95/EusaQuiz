/**
 * Controller de Usuarios (delgado): delega toda la lógica a usuarioService
 * y transforma resultados/errores a respuestas HTTP.
 *
 * Cada función recibe (req,res,next) y:
 *  - llama al servicio correspondiente
 *  - en caso de éxito envía JSON con { ok:true, data: ... }
 *  - en caso de error pasa el error a next(err) o responde con status adecuado
 *
 * Notas:
 * - Mantén las validaciones (middlewares) en las rutas (ej. validarCrearUsuario).
 * - Aquí no se hace hashing ni verificación de tokens; eso correspondería al servicio o a middlewares.
 */

const usuarioService = require('../services/usuarioService');

async function listarUsuarios(req, res, next) {
  try {
    const limit = req.query.limit || 100;
    const skip = req.query.skip || 0;
    const usuarios = await usuarioService.listarUsuarios({ limit, skip });
    return res.json({ ok: true, data: usuarios });
  } catch (err) {
    next(err);
  }
}

async function obtenerUsuario(req, res, next) {
  try {
    const id = req.params.id;
    const u = await usuarioService.obtenerUsuarioPorId(id);
    if (!u) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    return res.json({ ok: true, data: u });
  } catch (err) {
    next(err);
  }
}

async function crearUsuario(req, res, next) {
  try {
    const payload = req.body;
    const u = await usuarioService.crearUsuario(payload);
    return res.status(201).json({ ok: true, data: u });
  } catch (err) {
    // Manejo de errores esperados desde el servicio
    if (err && err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ ok: false, mensaje: err.message });
    }
    next(err);
  }
}

async function actualizarUsuario(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const u = await usuarioService.actualizarUsuario(id, payload);
    if (!u) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    return res.json({ ok: true, data: u });
  } catch (err) {
    next(err);
  }
}

async function borrarUsuario(req, res, next) {
  try {
    const id = req.params.id;
    const u = await usuarioService.borrarUsuario(id);
    if (!u) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    return res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  borrarUsuario
};