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
const fs = require('fs');
const path = require('path');

async function listarUsuarios(req, res, next) {
  try {
    const limit = req.query.limit || 100;
    const skip = req.query.skip || 0;
    const rol = req.query.rol;
    const usuarios = await usuarioService.listarUsuarios({ limit, skip, rol });
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

async function actualizarFotoPerfil(req, res, next) {
  try {
    const id = req.params.id;
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'No se ha subido ningún archivo' });
    }

    const u = await usuarioService.obtenerUsuarioPorId(id);
    if (!u) {
      // Borrar el archivo si el usuario no existe
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    // Nombre de usuario sanitizado para el archivo
    const nombreSanitizado = u.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const extension = path.extname(req.file.originalname);
    const nuevoNombre = `${nombreSanitizado}_${u.idPortal}${extension}`;
    const nuevaRuta = path.join('uploads/profiles', nuevoNombre);

    // Borrar imagen anterior si existe
    if (u.fotoPerfil) {
      const rutaAnterior = path.join(__dirname, '../../', u.fotoPerfil);
      if (fs.existsSync(rutaAnterior)) {
        try {
          fs.unlinkSync(rutaAnterior);
        } catch (e) {
          console.error('Error borrando foto anterior:', e);
        }
      }
    }

    // Renombrar el archivo temporal al nombre definitivo
    fs.renameSync(req.file.path, nuevaRuta);

    // Actualizar usuario en DB (guardamos la ruta relativa)
    const urlFoto = `uploads/profiles/${nuevoNombre}`;
    await usuarioService.actualizarUsuario(id, { fotoPerfil: urlFoto });

    return res.json({
      ok: true,
      mensaje: 'Foto de perfil actualizada',
      fotoPerfil: urlFoto
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  borrarUsuario,
  actualizarFotoPerfil
};