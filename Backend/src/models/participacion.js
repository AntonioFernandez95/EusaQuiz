const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- Sub-esquema para las Respuestas (Embebido) ---
// El PDF indica embeber respuestas porque solo tienen sentido dentro de esta participación [cite: 328]
const RespuestaSchema = new mongoose.Schema({
    idPregunta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pregunta',
        required: true
    }, // [cite: 345]

    opcionesMarcadas: {
        type: [Number],
        default: []
    }, // Array de índices. Vacío si no contesta [cite: 346, 349]

    esCorrecta: {
        type: Boolean,
        required: true
    }, // [cite: 350]

    tiempoRespuestaSeg: {
        type: Number,
        default: 0
    }, // Clave en modo 'en_vivo', opcional en 'programada' [cite: 351, 352]

    puntosObtenidos: {
        type: Number,
        default: 0
    }, // Puntos específicos de esta pregunta [cite: 353]

    respondidaEn: {
        type: Date,
        default: Date.now
    } // Momento exacto [cite: 354]
}, { _id: false });

// --- Esquema Principal de Participación ---
const ParticipacionSchema = new mongoose.Schema({
    // --- Referencias (Referencing) ---
    idPartida: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partida',
        required: true
    }, // Referencia para saber en qué sala está y sacar rankings 

    idAlumno: {
        type: String, // Usamos String si tu ID de usuario es externo (idPortal), o ObjectId si es interno de Mongo.
        // El PDF menciona referencia por ObjectId en pág 1 , ajusta según tu Auth.
        required: true,
        index: true
    }, // Necesario para estadísticas por alumno  

    // --- Estado y Modalidad ---
    estado: {
        type: String,
        enum: Object.values(tipos.ESTADOS_PARTIDA),
        default: tipos.ESTADOS_PARTIDA.ACTIVA,
    },

    modo: {
        type: String,
        enum: Object.values(tipos.MODOS_JUEGO), //!PROGRAMACION?
        required: true
    }, // Copia del tipo de partida  

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
    timestamps: false // Gestionamos inicioEn y finEn manualmente según PDF
});

// Índice compuesto para asegurar que un alumno no tenga duplicados en la misma partida activa
ParticipacionSchema.index({ idPartida: 1, idAlumno: 1 });

module.exports = mongoose.model('Participacion', ParticipacionSchema, 'participaciones');