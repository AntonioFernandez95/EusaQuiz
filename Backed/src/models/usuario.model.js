const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  idPortal: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellidos: { type: String },
  email: { type: String, required: true },
  rol: { 
    type: String, 
    enum: ['alumno', 'profesor', 'admin'], 
    default: 'alumno' 
  },
  creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', usuarioSchema);