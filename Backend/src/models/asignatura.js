const mongoose = require('mongoose');

const AsignaturaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    curso: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Curso',
        required: true
    }
}, {
    timestamps: {
        createdAt: 'creadoEn',
        updatedAt: 'actualizadoEn'
    }
});

// Índice compuesto para evitar asignaturas duplicadas en el mismo curso
AsignaturaSchema.index({ nombre: 1, curso: 1 }, { unique: true });

module.exports = mongoose.model('Asignatura', AsignaturaSchema, 'asignaturas');
