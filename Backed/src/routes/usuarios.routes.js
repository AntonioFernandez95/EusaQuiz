const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');

router.get('/', usuariosController.obtenerTodos);
router.post('/', usuariosController.crear);
//añadir router.get('/:id', ...) etc.

module.exports = router;