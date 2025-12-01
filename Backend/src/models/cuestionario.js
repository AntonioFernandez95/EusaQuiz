const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- 1. Subdocumento ArchivoOrigen (para cuestionarios importados)
const ArchivoOrigenSchema = new mongoose.Schema({
    nombreArchivo: { type: String }, // No estaba en tu JSON, pero es necesario
    tipoArchivo: {
        type: String,
        enum: Object.values(tipos.EXTENSIONES),
        required: true
    }, // Corresponde al campo 'archivoOrigen: "pdf"' aplanado
    importadoEn: { type: Date, default: Date.now }
}, { _id: false });

// --- 2. Subdocumento Programacion (para tipoCuestionario = "examen")
const ProgramacionSchema = new mongoose.Schema({
    fechalnicio: { type: Date }, // Corresponde a "fechaInicio"
    fechaFin: { type: Date }, // Corresponde a "fechaFin"
    tiempoTotalMin: { type: Number }, // Corresponde a "tiempoTotalMin"
    permitirNavegacion: { type: Boolean, default: true }, // Corresponde a "permitirNavegacion"
    envioAutomatico: { type: Boolean, default: true } // Corresponde a "envioAutomatico"
}, { _id: false });

// --- 3. Esquema Principal Cuestionario
const CuestionarioSchema = new mongoose.Schema({
    // --- Atributos Principales y de Identificación ---
    titulo: { type: String, required: true },
    descripcion: { type: String },
    asignatura: { type: String },
    curso: { type: String },
    centro: {
        type: String,
        enum: Object.values(tipos.CENTROS),
        required: true
    },

    // ATENCIÓN CRÍTICA: Se mantiene como String (ID EXTERNO del Dashboard), 
    // aunque el ejemplo use $oid. Esto es VITAL para tu arquitectura.
    idProfesor: { type: String, required: true },

    origen: {
        type: String,
        enum: Object.values(tipos.ORIGEN),
        default: tipos.ORIGEN.MANUAL,
    },
    estado: {
        type: String,
        enum: Object.values(tipos.ESTADO_CUESTIONARIO),
        default: tipos.ESTADO_CUESTIONARIO.BORRADOR,
    },

    // --- Subdocumento de Origen (Anidando campos) ---
    archivoOrigen: { type: ArchivoOrigenSchema }, // Usaremos esto para el campo 'archivoOrigen: "pdf"'

    // --- Atributos de Configuración General ---
    tipoCuestionario: {
        type: String,
        enum: Object.values(tipos.MODOS_JUEGO), 
        default: tipos.MODOS_JUEGO.EN_VIVO,
        required: true
    },
    tiempoPorPreguntaSeg: { type: Number, default: 20 },
    mostrarRanking: { type: Boolean, default: true },
    mezclarPreguntas: { type: Boolean, default: true },
    mezclarRespuestas: { type: Boolean, default: true },
    modoCalificacion: {
        type: String,
        enum: ["velocidad_precision", "solo_acierto", "texto"], //!preguntar
        default: 'velocidad_precision'
    },

    // --- Subdocumento de Programación (Anidando campos aplanados) ---
    programacion: { type: ProgramacionSchema },

    // --- Atributos para Métricas Internas y Control de Fechas ---
    numPreguntas: { type: Number, default: 0 },
    numVecesJugado: { type: Number, default: 0 },

    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: Date.now }
},);

module.exports = mongoose.models.Cuestionario || mongoose.model('Cuestionario', CuestionarioSchema, 'cuestionarios');