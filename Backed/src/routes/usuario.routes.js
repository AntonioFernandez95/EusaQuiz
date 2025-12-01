const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuario.controller');

router.get('/', usuarioController.obtenerTodos);
router.post('/', usuarioController.crear);

module.exports = router;