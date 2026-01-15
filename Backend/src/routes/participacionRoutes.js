const express = require('express');
const router = express.Router();
const controller = require('../controllers/participacionController');

console.log("--> Loaded participacionRoutes.js");

router.use((req, res, next) => {
    console.log(`[ParticipacionRoutes] Request: ${req.method} ${req.path}`);
    next();
});

/**
 * @swagger
 * /api/participaciones/responder:
 *   post:
 *     summary: Enviar respuesta (alternativo)
 *     description: Endpoint alternativo para que el alumno envíe una respuesta.  Similar a /api/partidas/responder. 
 *     tags: [Participaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RespuestaInput'
 *           example:
 *             idPartida: "64a7b2c3d4e5f6791"
 *             idAlumno: "ALUMNO_001"
 *             idPregunta: "64a7b2c3d4e5f6790"
 *             opcionesMarcadas: [0]
 *             tiempoEmpleado: 8
 *     responses:
 *       200:
 *         description: Respuesta registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     esCorrecta:
 *                       type: boolean
 *                     puntosObtenidos:
 *                       type: integer
 *       400:
 *         description: Datos inválidos o pregunta ya respondida
 *       500:
 *         description: Error del servidor
 */
// POST /api/participaciones/responder -> Alumno envía respuesta
router.post('/responder', controller.enviarRespuesta);

// GET /api/participaciones/progreso/:idPartida/:idAlumno -> Alumno consulta su estado
router.get('/progreso/:idPartida/:idAlumno', controller.obtenerMiProgreso);

// GET /api/participaciones/ranking/:idPartida -> Profesor consulta ranking en vivo
router.get('/ranking/:idPartida', controller.obtenerRankingPartida);

// GET /api/participaciones/historial/:idAlumno -> Historial completo del alumno
router.get('/historial/:idAlumno', controller.obtenerHistorialAlumno);

module.exports = router;