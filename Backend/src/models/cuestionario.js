/*
{
  "titulo": "Examen Final JS",
  "descripcion": "Preguntas sobre Mongoose y Node",
  "asignatura": "Programación",
  "curso": "1 DAM",
  "centro": "EUSA",
  "idProfesor": "AQUI_EL_OBJECT_ID_DEL_PROFE_CREADO_ANTES", 
  "origen": "manual"
}
*/
const mongoose = require('mongoose');
const tipos = require('../utils/constants');

// --- 1. Subdocumento ArchivoOrigen (para cuestionarios importados) ---
const ArchivoOrigenSchema = new mongoose.Schema({
    nombreArchivo: { type: String },
    tipoArchivo: {
        type: String,
        enum: Object.values(tipos.EXTENSIONES),
        required: true
    },
    importadoEn: { type: Date, default: Date.now }
}, { _id: false });

// --- 2. Esquema Principal Cuestionario ---
const CuestionarioSchema = new mongoose.Schema({
    // --- Atributos Principales ---
    titulo: { type: String, required: true },
    descripcion: { type: String },
    asignatura: { type: String },
    curso: { type: String },
    centro: {
        type: String,
        enum: Object.values(tipos.CENTROS),
        required: true
    },
    idProfesor: {//!ATENCION
        type: String,
        ref: 'usuarios',
        required: true
    },
    origen: {
        type: String,
        enum: Object.values(tipos.ORIGEN),
        default: tipos.ORIGEN.IMPORTADO,
    },
    estado: {
        type: String,
        enum: Object.values(tipos.ESTADO_CUESTIONARIO),
        default: tipos.ESTADO_CUESTIONARIO.BORRADOR,
    },

    // --- Subdocumentos ---
    archivoOrigen: { type: ArchivoOrigenSchema },

  // --- Métricas Internas ---
    numPreguntas: { type: Number, default: 0 },
    numVecesJugado: { type: Number, default: 0 },

    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Cuestionario || mongoose.model('Cuestionario', CuestionarioSchema, 'cuestionarios');

