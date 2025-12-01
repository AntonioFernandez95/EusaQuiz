const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');
const { validarCrearUsuario } = require('../middlewares/validators/usuarioValidators');
// --- Rutas de Lectura ---
// GET /api/usuarios?rol=alumno&busqueda=pepe -> Listar con filtros
router.get('/', controller.obtenerUsuarios);

// GET /api/usuarios/:id -> Detalle por ID interno
router.get('/:id', controller.obtenerUsuarioPorId);

// GET /api/usuarios/portal/:idPortal -> Detalle por ID externo (Login)
router.get('/portal/:idPortal', controller.obtenerPorIdPortal);

// --- Rutas de Escritura ---
// POST /api/usuarios -> Crear
router.post('/', validarCrearUsuario, controller.crearUsuario);

// PUT /api/usuarios/:id -> Actualizar
router.put('/:id', controller.actualizarUsuario);

// DELETE /api/usuarios/:id -> Eliminar
router.delete('/:id', controller.eliminarUsuario);

module.exports = router;