const mongoose = require('mongoose');

const AjustesSchema = new mongoose.Schema({
    nombreApp: {
        type: String,
        default: 'CampusQuiz',
        trim: true
    },
    logoAppUrl: {
        type: String,
        default: 'assets/img/logo-camera.png'
    }
}, {
    timestamps: {
        createdAt: 'creadoEn',
        updatedAt: 'actualizadoEn'
    }
});

module.exports = mongoose.model('Ajustes', AjustesSchema, 'ajustes');
