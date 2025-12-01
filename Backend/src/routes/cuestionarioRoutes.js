const express = require('express');
const router = express.Router();
const controller = require('../controllers/cuestionarioController');

// --- RUTAS DE LECTURA ---

// GET /api/cuestionarios -> Obtener todos (o filtrar por ?asignatura=X)
// ¡IMPORTANTE! Pon esta ruta ANTES de /:id para evitar conflictos
router.get('/', controller.obtenerTodos);

// GET /api/cuestionarios/profesor/:idProfesor
router.get('/profesor/:idProfesor', controller.obtenerMisCuestionarios);

// GET /api/cuestionarios/:id
router.get('/:id', controller.obtenerPorId);


// --- RUTAS DE ESCRITURA ---

// POST /api/cuestionarios -> Crear
router.post('/', controller.crearCuestionario);

// PUT /api/cuestionarios/:id -> Editar información general (Título, config, etc.)
router.put('/:id', controller.actualizarCuestionario);

// DELETE /api/cuestionarios/:id -> Borrar cuestionario
router.delete('/:id', controller.eliminarCuestionario);

// Ruta especial para contadores (Uso interno del juego)
router.put('/contadores/:id', controller.actualizarContadoresCuestionario);

module.exports = router;