const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');
const { validarCrearUsuario } = require('../middlewares/validators/usuarioValidators');
// --- Rutas de Lectura ---
 
module.exports = router;