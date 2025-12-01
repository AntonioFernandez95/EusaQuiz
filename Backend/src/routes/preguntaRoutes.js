const express = require('express');
const router = express.Router();
const controller = require('../controllers/preguntaController');

// --- RUTAS DE LECTURA ---

// GET /api/preguntas/cuestionarios/:idCuestionario -> Todas las de un quiz
router.get('/cuestionarios/:idCuestionario', controller.obtenerPreguntasPorCuestionario);

// GET /api/preguntas/:id -> Obtener una sola (para editar)
router.get('/:id', controller.obtenerPreguntaPorId);


// --- RUTAS DE ESCRITURA ---

// POST /api/preguntas -> Crear nueva
router.post('/', controller.crearPregunta);

// PUT /api/preguntas/:id -> Editar pregunta
router.put('/:id', controller.actualizarPregunta);

// DELETE /api/preguntas/:id -> Borrar pregunta (y baja el contador del quiz)
router.delete('/:id', controller.eliminarPregunta);

module.exports = router;