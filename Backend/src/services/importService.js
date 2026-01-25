const Cuestionario = require('../models/cuestionario');
const Pregunta = require('../models/pregunta');
const Asignatura = require('../models/asignatura');
const Curso = require('../models/curso');
const tipos = require('../utils/constants');

/**
 * Importa un examen completo (Cuestionario + Preguntas)
 */
async function importExamen(data) {
    const { nombre, asignatura, curso, centro, idProfesor, preguntas } = data;

    console.log('importExamen - datos recibidos:', { nombre, asignatura, curso, centro, idProfesor, numPreguntas: preguntas?.length });

    // Validaciones
    if (!preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
        throw new Error('No hay preguntas para importar');
    }

    if (!idProfesor) {
        throw new Error('El ID del profesor es requerido');
    }

    // Validar centro - debe ser un ObjectId válido si se proporciona (validación básica)
    let centroFinal = centro;
    if (centro && !centro.match(/^[0-9a-fA-F]{24}$/)) {
        // Si no es un ObjectId, asumimos que es un centro legacy o nombre, lo dejamos pasar o validamos contra BD si fuera necesario
        // Por ahora, para arreglar el crash, eliminamos la validación contra constantes inexistentes
        // Si el valor no es válido, podríamos establecer un default seguro si conociéramos el ID de NEGOCIOS,
        // pero mejor dejar el valor original y que falle la validación de Mongoose si es incorrecto.
    }

    // 0. Verificar si ya existe un cuestionario con el mismo nombre para este profesor
    const existente = await Cuestionario.findOne({
        titulo: nombre,
        idProfesor: idProfesor,
        estado: { $ne: 'archivado' }
    });

    if (existente) {
        // Si existe, comprobamos si es "el mismo" (simplificado: mismo número de preguntas)
        // O simplemente avisamos. El usuario pidió: "decir que ya existe"
        // Y "Si ha cambiado algo... considerarlo nuevo".
        // Estrategia: Si tiene el EXACTO mismo nombre, sugerimos renombrar.
        throw new Error(`Ya existe un cuestionario con el título "${nombre}". Por favor, renómbralo en el archivo o en la edición para importarlo como una nueva versión.`);
    }

    // RESOLUCIÓN DE ASIGNATURA Y CURSO (FIX: Evitar error de cast a ObjectId)
    let asignaturaId = undefined;
    let cursoId = undefined;

    // Verificar Asignatura
    if (asignatura) {
        if (asignatura.match(/^[0-9a-fA-F]{24}$/)) {
            asignaturaId = asignatura; // Es un ObjectId válido
        } else {
            // Intentar buscar por nombre
            const asigEncontrada = await Asignatura.findOne({ nombre: new RegExp('^' + asignatura + '$', 'i') });
            if (asigEncontrada) {
                asignaturaId = asigEncontrada._id;
            }
            // Si no se encuentra, se deja undefined para que no falle la validación de tipo
        }
    }

    // Verificar Curso
    if (curso) {
        if (curso.match(/^[0-9a-fA-F]{24}$/)) {
            cursoId = curso; // Es un ObjectId válido
        } else {
            // Intentar buscar por nombre
            const cursoEncontrado = await Curso.findOne({ nombre: new RegExp('^' + curso + '$', 'i') });
            if (cursoEncontrado) {
                cursoId = cursoEncontrado._id;
            }
        }
    }

    // 1. Crear el Cuestionario
    const nuevoCuestionario = new Cuestionario({
        titulo: nombre || `Examen Importado ${Date.now()}`,
        asignatura: asignaturaId,
        curso: cursoId,
        centro: centroFinal,
        idProfesor: idProfesor,
        origen: tipos.ORIGEN.IMPORTADO,
        estado: tipos.ESTADO_CUESTIONARIO.ACTIVO,
        numPreguntas: preguntas.length
    });

    const cuestionarioGuardado = await nuevoCuestionario.save();

    // 2. Crear las Preguntas
    const preguntasMapped = preguntas.map((p, index) => {
        // Mapear opciones del formato JSON (strings) al formato BD (objetos)
        const opcionesFormatted = p.opciones.map(optTexto => ({
            textoOpcion: optTexto,
            esCorrecta: optTexto === p.respuesta_correcta,
            orden: index + 1
        }));

        // Soporte para múltiples formatos: pregunta, enunciado, texto
        const textoPregunta = p.pregunta || p.enunciado || p.texto || '';

        return {
            idCuestionario: cuestionarioGuardado._id,
            textoPregunta: textoPregunta,
            tipoPregunta: tipos.TIPOS_PREGUNTA.UNICA,
            opciones: opcionesFormatted,
            puntuacionMax: 1000,
            ordenPregunta: index + 1,
            temas: p.temas || [],
            dificultad: p.dificultad || 1
        };
    });

    await Pregunta.insertMany(preguntasMapped);

    return cuestionarioGuardado;
}

module.exports = {
    importExamen
};
