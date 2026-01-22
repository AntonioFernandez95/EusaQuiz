const mongoose = require('mongoose');

const CursoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    centro: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Centro',
        required: true
    }
}, {
    timestamps: {
        createdAt: 'creadoEn',
        updatedAt: 'actualizadoEn'
    }
});

module.exports = mongoose.model('Curso', CursoSchema, 'cursos');
