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
    let cursoId;

    if (isObjectId) {
      cursoId = curso;
    } else {
      // Es un nombre o código de curso, buscar el ObjectId
      if (Curso) {
        const cursoDoc = await Curso.findOne({
          $or: [{ nombre: curso }, { codigo: curso }]
        }).lean();

        if (cursoDoc) {
          cursoId = cursoDoc._id;
        } else {
          // Si no se encuentra el curso, devolver array vacío
          console.log(`[usuarioService] Curso "${curso}" no encontrado`);
          return [];
        }
      }
    }

    // Buscar en curso (alumnos) O en cursos (profesores)
    if (cursoId) {
      filter.$or = [
        { curso: cursoId },
        { cursos: cursoId }
      ];
    }
  }

  // Filtrar por activos por defecto si es rol alumno
  if (rol === 'alumno') {
    filter.activo = true;
  }

  const query = Usuario.find(filter)
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')  // Para alumnos
    .populate('cursos', 'nombre codigo') // Para profesores (múltiples cursos)
    .populate({
      path: 'asignaturas',
      select: 'nombre curso',
      populate: { path: 'curso', select: 'nombre codigo' }
    })
    .skip(+skip)
    .limit(+limit);
  const items = await query.exec();
  return items;
}

async function obtenerUsuarioPorId(id) {
  if (!Usuario) throw new Error('Modelo Usuario no encontrado.');
  const u = await Usuario.findById(id)
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')  // Para alumnos
    .populate('cursos', 'nombre codigo') // Para profesores (múltiples cursos)
    .populate({
      path: 'asignaturas',
      select: 'nombre curso',
      populate: { path: 'curso', select: 'nombre codigo' }
    })
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
      // Obtener los cursos del usuario (puede venir en payload o hay que buscarlo)
      let cursosIds = [];

      // Para profesores: usar cursos (array)
      if (payload.cursos && Array.isArray(payload.cursos) && payload.cursos.length > 0) {
        cursosIds = payload.cursos;
      }
      // Para alumnos: usar curso (singular)
      else if (payload.curso) {
        cursosIds = [payload.curso];
      }
      // Si no viene en payload, obtener del usuario actual
      else {
        const usuarioActual = await Usuario.findById(id).select('curso cursos rol').lean();
        if (usuarioActual?.rol === 'profesor' && usuarioActual?.cursos?.length > 0) {
          cursosIds = usuarioActual.cursos;
        } else if (usuarioActual?.curso) {
          cursosIds = [usuarioActual.curso];
        }
      }

      // Construir el filtro de búsqueda
      const filtroAsignaturas = {
        nombre: { $in: payload.asignaturas }
      };

      // Si hay cursos, filtrar asignaturas solo de esos cursos
      if (cursosIds.length > 0) {
        filtroAsignaturas.curso = { $in: cursosIds };
      }

      // Buscar las asignaturas por nombre (y cursos si aplica)
      const asignaturasEncontradas = await Asignatura.find(filtroAsignaturas)
        .select('_id nombre curso').lean();

      // Mapear nombres a IDs
      const asignaturasIds = asignaturasEncontradas.map(a => a._id);

      console.log('[usuarioService] Convirtiendo asignaturas:', {
        nombresRecibidos: payload.asignaturas,
        cursosFiltro: cursosIds.map(id => id.toString()),
        idsEncontrados: asignaturasIds.map(id => id.toString())
      });

      payload.asignaturas = asignaturasIds;
    }
  }

  const u = await Usuario.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate('centro', 'nombre codigo')
    .populate('curso', 'nombre codigo')  // Para alumnos
    .populate('cursos', 'nombre codigo') // Para profesores (múltiples cursos)
    .populate({
      path: 'asignaturas',
      select: 'nombre curso',
      populate: { path: 'curso', select: 'nombre codigo' }
    })
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