// src/controllers/usuarios.controller.js
const usuariosService = require('../services/usuarios.service');

exports.obtenerTodos = async (req, res) => {
  try {
    const usuarios = await usuariosService.listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const nuevoUsuario = await usuariosService.crearUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};