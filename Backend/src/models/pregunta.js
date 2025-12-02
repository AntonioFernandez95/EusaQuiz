/*{
  "idCuestionario": "AQUI_EL_ID_DEL_CUESTIONARIO",
  "textoPregunta": "¿Qué método usa Mongoose para guardar?",
  "tipoPregunta": "unica",
  "puntuacionMax": 1000,
  "tiempoLimiteSeg": 20, 
  "ordenPregunta": 1,
  "opciones": [
      { "textoOpcion": ".save()", "esCorrecta": true, "orden": 1 },
      { "textoOpcion": ".insert()", "esCorrecta": false, "orden": 2 }
  ]
} */

const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- Sub-esquema para las Opciones (Embebidas) ---
// (Estas opciones solo tienen sentido para la pregunta en la que están)  
const OpcionSchema = new mongoose.Schema({
    textoOpcion: { type: String, required: true },
    esCorrecta: { type: Boolean, default: false },
    orden: { type: Number } // Para mantener el orden original
}, { _id: false });

// --- Esquema Principal de la Pregunta ---
const PreguntaSchema = new mongoose.Schema({
    // --- Referencia a Colección Padre ---
    idCuestionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cuestionarios',
        required: true
    }, // Referencia al cuestionario al que pertenece

    // --- Atributos de Contenido ---
    textoPregunta: { type: String, required: true }, // Enunciado 
    tipoPregunta: {
        type: String,
        enum: tipos.TIPOS_PREGUNTA,
        default: tipos.TIPOS_PREGUNTA.UNICA,
    },

    // Opciones Embebidas  
    opciones: [OpcionSchema],

    // --- Atributos de Configuración y Métricas ---
    puntuacionMax: { type: Number, default: 1000 }, // Puntos máximos que otorga 
    ordenPregunta: { type: Number, required: true }, // Posición dentro del cuestionario 
    estado: {
        type: String,
        enum: tipos.ESTADO_PREGUNTA,
        default: tipos.ESTADO_PREGUNTA.VISIBLE,
    }, // Permite deshabilitar  

    // --- Fechas de Control ---
    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Pregunta || mongoose.model('Pregunta', PreguntaSchema, 'preguntas');