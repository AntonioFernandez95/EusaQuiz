const Usuario = require('../models/usuario.model');

exports.listarUsuarios = async () => {
  return await Usuario.find(); 
};

exports.crearUsuario = async (datosUsuario) => {
  const nuevoUsuario = new Usuario(datosUsuario);
  return await nuevoUsuario.save();
};