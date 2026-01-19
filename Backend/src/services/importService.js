const Cuestionario = require('../models/cuestionario');
const Pregunta = require('../models/pregunta');
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

    // Validar centro - debe ser uno de los valores permitidos
    const centrosValidos = Object.values(tipos.CENTROS);
    const centroFinal = centro || tipos.CENTROS.EUSA;
    if (!centrosValidos.includes(centroFinal)) {
        throw new Error(`Centro no válido: "${centro}". Valores permitidos: ${centrosValidos.join(', ')}`);
    }

    // 1. Crear el Cuestionario
    const nuevoCuestionario = new Cuestionario({
        titulo: nombre || `Examen Importado ${Date.now()}`,
        asignatura: asignatura || 'General',
        curso: curso || '',
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
