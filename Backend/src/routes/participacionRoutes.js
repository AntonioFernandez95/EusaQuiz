const express = require('express');
const router = express.Router();
const controller = require('../controllers/participacionController');

// POST /api/participaciones/responder -> Alumno envía respuesta
router.post('/responder', controller.enviarRespuesta);

// GET /api/participaciones/progreso/:idPartida/:idAlumno -> Alumno consulta su estado
router.get('/progreso/:idPartida/:idAlumno', controller.obtenerMiProgreso);

// GET /api/participaciones/ranking/:idPartida -> Profesor consulta ranking en vivo
router.get('/ranking/:idPartida', controller.obtenerRankingPartida);

module.exports = router;