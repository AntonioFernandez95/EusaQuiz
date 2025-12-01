const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- Sub-esquema para las Opciones (Embebidas) ---
// (Estas opciones solo tienen sentido para la pregunta en la que están) [cite: 86]
const OpcionSchema = new mongoose.Schema({
    textoOpcion: { type: String, required: true },
    esCorrecta: { type: Boolean, default: false },
    orden: { type: Number } // Para mantener el orden original [cite: 96]
}, { _id: false });

// --- Esquema Principal de la Pregunta ---
const PreguntaSchema = new mongoose.Schema({
    // --- Referencia a Colección Padre ---
    idCuestionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cuestionarios',
        required: true
    }, // Referencia al cuestionario al que pertenece [cite: 89]

    // --- Atributos de Contenido ---
    textoPregunta: { type: String, required: true }, // Enunciado [cite: 90]
    tipoPregunta: {
        type: String,
        enum: tipos.TIPOS_PREGUNTA,
        default: tipos.TIPOS_PREGUNTA.UNICA,
    }, // [cite: 91, 92]

    // Opciones Embebidas [cite: 93]
    opciones: [OpcionSchema],

    // --- Atributos de Configuración y Métricas ---
    puntuacionMax: { type: Number, default: 1000 }, // Puntos máximos que otorga [cite: 97]
    tiempoLimiteSeg: { type: Number, default: 20 }, // Tiempo por pregunta para modo en vivo [cite: 98]
    ordenPregunta: { type: Number, required: true }, // Posición dentro del cuestionario [cite: 100]
    estado: {
        type: String,
        enum: tipos.ESTADO_PREGUNTA,
        default: tipos.ESTADO_PREGUNTA.VISIBLE,
    }, // Permite deshabilitar  

    // --- Fechas de Control ---
    creadoEn: { type: Date, default: Date.now }, // [cite: 102]
    actualizadoEn: { type: Date, default: Date.now } // [cite: 103]
});

module.exports = mongoose.models.Pregunta || mongoose.model('Pregunta', PreguntaSchema, 'preguntas');