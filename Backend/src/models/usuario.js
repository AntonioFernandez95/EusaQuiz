/*
{
  "idPortal": "PROFE_01",
  "nombre": "Profesor Oak",
  "email": "oak@pokedex.com",
  "rol": "profesor",
  "cursos": [ObjectId("...")],  // Array de cursos para profesores
  "curso": ObjectId("..."),     // Curso único para alumnos
  "centro": ObjectId("...")     // Referencia a Centro
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

    // Curso único para alumnos
    curso: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Curso',
        default: null,
        required: function () {
            return this.rol === tipos.ROLES.ALUMNO;
        }
    },

    // Array de cursos para profesores
    cursos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Curso'
    }],

    centro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Centro',
        required: function () {
            return this.rol !== tipos.ROLES.ADMIN;
        }
    },

    asignaturas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asignatura'
    }],

    password: {
        type: String,
        required: false // Opcional para usuarios que vienen solo de portal
    },

    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date, default: Date.now },

    creadoEn: { type: Date, default: Date.now },
    actualizadoEn: { type: Date, default: Date.now },

    fotoPerfil: {
        type: String,
        default: null
    },

    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
