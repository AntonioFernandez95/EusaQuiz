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

const Asignatura = (() => {
  try {
    return require('../models/asignatura');
  } catch (err) {
    return null;
  }
})();

const Curso = (() => {
  try {
    return require('../models/curso');
  } catch (err) {
    return null;
  }
})();

async function listarUsuarios({ limit = 100, skip = 0, rol, curso } = {}) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');

  const filter = {};
  if (rol) filter.rol = rol;
  
  // Si viene curso, puede ser un ObjectId o un nombre/código de curso
  if (curso) {
    // Verificar si es un ObjectId válido
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(curso);
    
    if (isObjectId) {
      filter.curso = curso;
    } else {
      // Es un nombre o código de curso, buscar el ObjectId
      if (Curso) {
        const cursoDoc = await Curso.findOne({
          $or: [{ nombre: curso }, { codigo: curso }]
        }).lean();
        
        if (cursoDoc) {
          filter.curso = cursoDoc._id;
        } else {
          // Si no se encuentra el curso, devolver array vacío
          console.log(`[usuarioService] Curso "${curso}" no encontrado`);
          return [];
        }
      }
    }
  }

  const query = Usuario.find(filter)
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')
    .populate('asignaturas', 'nombre')
    .skip(+skip)
    .limit(+limit);
  const items = await query.exec();
  return items;
}

async function obtenerUsuarioPorId(id) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const u = await Usuario.findById(id)
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')
    .populate('asignaturas', 'nombre')
    .exec();
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
  
  // Si vienen asignaturas como array de strings (nombres), convertirlas a ObjectIds
  if (payload.asignaturas && Array.isArray(payload.asignaturas) && payload.asignaturas.length > 0) {
    // Verificar si son strings (nombres) o ya son ObjectIds
    const primerElemento = payload.asignaturas[0];
    const sonNombres = typeof primerElemento === 'string' && 
                       !primerElemento.match(/^[0-9a-fA-F]{24}$/); // No es un ObjectId válido
    
    if (sonNombres && Asignatura) {
      // Buscar las asignaturas por nombre y obtener sus IDs
      const asignaturasEncontradas = await Asignatura.find({
        nombre: { $in: payload.asignaturas }
      }).select('_id nombre').lean();
      
      // Mapear nombres a IDs
      const asignaturasIds = asignaturasEncontradas.map(a => a._id);
      
      console.log('[usuarioService] Convirtiendo asignaturas:', {
        nombresRecibidos: payload.asignaturas,
        idsEncontrados: asignaturasIds.map(id => id.toString())
      });
      
      payload.asignaturas = asignaturasIds;
    }
  }
  
  const u = await Usuario.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')
    .populate('asignaturas', 'nombre')
    .exec();
  
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