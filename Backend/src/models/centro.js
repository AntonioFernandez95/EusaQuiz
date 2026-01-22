const mongoose = require('mongoose');

const CentroSchema = new mongoose.Schema({
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
    }
}, {
    timestamps: {
        createdAt: 'creadoEn',
        updatedAt: 'actualizadoEn'
    }
});

module.exports = mongoose.model('Centro', CentroSchema, 'centros');
