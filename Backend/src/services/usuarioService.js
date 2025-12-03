/**
 * Servicio para usuarios: contiene la lógica de acceso a datos.
 * - Encapsula operaciones con el modelo Usuario.
 * - Devuelve valores/objetos y lanza errores para que el controller los convierta
 *   en respuestas HTTP.
 *
 * Ajusta/añade validaciones, hashing de contraseñas, y reglas de negocio según necesites.
 */

const Usuario = (() => {
  try {
    return require('../models/usuario');
  } catch (err) {
    // Si el modelo no existe, dejamos null para que las funciones lancen errores claros.
    return null;
  }
})();

async function listarUsuarios({ limit = 100, skip = 0 } = {}) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const query = Usuario.find().skip(+skip).limit(+limit);
  const items = await query.exec();
  return items;
}

async function obtenerUsuarioPorId(id) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const u = await Usuario.findById(id).exec();
  return u;
}

async function crearUsuario(payload = {}) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  // Ejemplo mínimo: evitar duplicados por email (si existe campo email)
  if (payload.email) {
    const existe = await Usuario.findOne({ email: payload.email }).exec();
    if (existe) {
      const err = new Error('Email ya en uso');
      err.code = 'DUPLICATE_EMAIL';
      throw err;
    }
  }

  const u = new Usuario(payload);
  await u.save();
  return u;
}

async function actualizarUsuario(id, payload = {}) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const u = await Usuario.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).exec();
  return u;
}

async function borrarUsuario(id) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const u = await Usuario.findByIdAndDelete(id).exec();
  return u;
}

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  borrarUsuario
};