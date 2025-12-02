/*
{
  "idPortal": "PROFE_01",
  "nombre": "Profesor Oak",
  "email": "oak@pokedex.com",
  "rol": "profesor",
  "curso": "1 DAM",  
  "centro": "EUSA"
}
  */
const mongoose = require('mongoose');
const tipos = require('../utils/constants');
const UsuarioSchema = new mongoose.Schema({
    // Identificador externo (Del sistema de Login del centro)
    idPortal: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    nombre: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    rol: {
        type: String,
        enum: Object.values(tipos.ROLES),
        required: true
    },
    curso: {
        type: String,
        enum: Object.values(tipos.CURSOS),
        default: null,
        required: true
    },
    centro: {
        type: String,
        enum: Object.values(tipos.CENTROS),
        required: true
    },

    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date, default: Date.now },

    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);