const Cuestionario = require('../models/cuestionario');
const Pregunta = require('../models/pregunta');
const tipos = require('../utils/constants');

/**
 * Importa un examen completo (Cuestionario + Preguntas)
 */
async function importExamen(data) {
    const { nombre, asignatura, curso, centro, idProfesor, preguntas } = data;

    if (!preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
        throw new Error('No hay preguntas para importar');
    }

    // 1. Crear el Cuestionario
    const nuevoCuestionario = new Cuestionario({
        titulo: nombre || `Examen Importado ${Date.now()}`,
        asignatura: asignatura || 'General',
        curso: curso || '',
        centro: centro || tipos.CENTROS.EUSA, // Default a EUSA si no viene
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

        return {
            idCuestionario: cuestionarioGuardado._id,
            textoPregunta: p.enunciado || p.texto,
            tipoPregunta: tipos.TIPOS_PREGUNTA.UNICA,
            opciones: opcionesFormatted,
            puntuacionMax: 1000,
            ordenPregunta: index + 1
        };
    });

    await Pregunta.insertMany(preguntasMapped);

    return cuestionarioGuardado;
}

module.exports = {
    importExamen
};
