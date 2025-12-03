// Controller para Usuarios adaptado a autenticación centralizada por la app padre.
// - Asume que el middleware authFromParent ya ha poblado req.user con el payload del JWT (si viene).
// - Controller delgado: delega en usuarioService y transforma req/res.
// - Incluye endpoints típicos: obtenerMiPerfil, actualizarMiPerfil, obtenerUsuarioPorId, buscarUsuarios.

const usuarioService = require('../services/usuarioService');

/**
 * Helper para enviar errores HTTP uniformes desde controllers.
 */
const sendError = (res, err) => {
  const status = err && err.status ? err.status : 500;
  return res.status(status).json({ ok: false, error: err.message || 'Error interno del servidor' });
};

/**
 * Obtener perfil del usuario autenticado (token desde app padre).
 * Devuelve documento BD si existe o payload del token si no hay doc.
 */
exports.obtenerMiPerfil = async (req, res) => {
  try {
    const usuario = await usuarioService.obtenerUsuarioDesdeReq(req);
    res.json({ ok: true, data: usuario });
  } catch (err) {
    return sendError(res, err);
  }
};

/**
 * Actualizar perfil del usuario autenticado.
 * Usa req.user para identificar al usuario.
 * Body: campos permitidos para actualización (sanitizar en rutas).
 */
exports.actualizarMiPerfil = async (req, res) => {
  try {
    const payload = req.user;
    if (!payload) return res.status(401).json({ ok: false, mensaje: 'No autenticado.' });

    const idUsuario = payload.sub || payload.id || payload._id;
    if (!idUsuario) return res.status(400).json({ ok: false, mensaje: 'No se pudo identificar usuario en token.' });

    const actualizado = await usuarioService.actualizarUsuario(idUsuario, req.body);
    res.json({ ok: true, mensaje: 'Perfil actualizado', data: actualizado });
  } catch (err) {
    return sendError(res, err);
  }
};

/**
 * Obtener usuario por id (endpoint opcional, puede requerir rol en rutas)
 */
exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
    res.json({ ok: true, data: usuario });
  } catch (err) {
    return sendError(res, err);
  }
};

/**
 * Buscar usuarios (ej: admin)
 * Query params: ?nombre=...&email=...
 */
exports.buscarUsuarios = async (req, res) => {
  try {
    const resultados = await usuarioService.buscarUsuarios(req.query);
    res.json({ ok: true, total: resultados.length, data: resultados });
  } catch (err) {
    return sendError(res, err);
  }
};