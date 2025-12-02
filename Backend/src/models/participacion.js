const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- Sub-esquema para las Respuestas (Embebido) ---
// El PDF indica embeber respuestas porque solo tienen sentido dentro de esta participación 
const RespuestaSchema = new mongoose.Schema({
    idPregunta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'preguntas',
        required: true
    },

    opcionesMarcadas: {
        type: [Number],
        default: []
    }, // Array de índices. Vacío si no contesta 

    esCorrecta: {
        type: Boolean,
        required: true
    },

    tiempoRespuestaSeg: {
        type: Number,
        default: 0
    }, // Clave en modo 'en_vivo', opcional en 'programada' 

    puntosObtenidos: {
        type: Number,
        default: 0
    }, // Puntos específicos de esta pregunta 

    respondidaEn: {
        type: Date,
        default: Date.now
    } // Momento exacto en el que se responde
}, { _id: false });

// --- Esquema Principal de Participación ---
const ParticipacionSchema = new mongoose.Schema({
    // --- Referencias (Referencing) ---
    idPartida: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partida',
        required: true
    }, // Referencia para saber en qué sala está y sacar rankings 

    idAlumno: {//!ATENCION
        type: String,
        ref: 'usuarios',
        required: true
    },

    // --- Estado y Modalidad ---
    estado: {
        type: String,
        enum: Object.values(tipos.ESTADOS_PARTIDA),
        default: tipos.ESTADOS_PARTIDA.ACTIVA,
    },

    tipoPartida: {
        type: String,
        enum: Object.values(tipos.MODOS_JUEGO),
        default: tipos.MODOS_JUEGO.EN_VIVO,
        required: true
    },

    // --- Métricas Globales (Resumen) ---
    puntuacionTotal: { type: Number, default: 0 }, // Suma final  

    aciertos: { type: Number, default: 0 },      //  
    fallos: { type: Number, default: 0 },        // 
    sinResponder: { type: Number, default: 0 },  //  

    tiempoTotalSeg: { type: Number, default: 0 }, // Tiempo total completado  

    // --- Fechas de Control ---
    inicioEn: { type: Date, default: Date.now }, // Fecha real de arranque  
    finEn: { type: Date }, // Fecha de finalización  

    // --- Detalle de Respuestas ---
    respuestas: [RespuestaSchema] // Lista con TODO lo respondido  

}, {
    timestamps: false 
});

// Índice compuesto para asegurar que un alumno no tenga duplicados en la misma partida activa
ParticipacionSchema.index({ idPartida: 1, idAlumno: 1 });

module.exports = mongoose.model('Participacion', ParticipacionSchema, 'participaciones');