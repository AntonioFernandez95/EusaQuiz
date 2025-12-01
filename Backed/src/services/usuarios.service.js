const Usuario = require('../models/usuario.model');

// Obtener todos los usuarios
exports.listarUsuarios = async () => {
  // Equivale a leer el JSON, pero desde Mongo
  return await Usuario.find(); 
};

// Crear un usuario nuevo
exports.crearUsuario = async (datosUsuario) => {
  // Equivale a push en el array y fs.writeFileSync
  const nuevoUsuario = new Usuario(datosUsuario);
  return await nuevoUsuario.save();
};

// Buscar por ID de Mongo
exports.obtenerPorId = async (id) => {
    return await Usuario.findById(id);
};