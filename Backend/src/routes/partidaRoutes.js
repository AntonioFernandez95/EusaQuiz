const express = require('express');
const router = express.Router();
const controller = require('../controllers/partidaController');

// --- RUTAS DE GESTIÓN (CRUD) ---
/**
 * @swagger
 * /api/partidas:
 *   get:
 *     summary: Obtener todas las partidas
 *     tags: [Partidas]
 *     parameters:
 *       - in: query
 *         name: idProfesor
 *         schema:
 *           type: string
 *         description: Filtrar por ID del profesor
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [espera, jugando, finalizada]
 *         description: Filtrar por estado de la partida
 *     responses:
 *       200:
 *         description: Lista de partidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Partida'
 */
// GET /api/partidas -> Obtener historial (filtros: ?idProfesor=X&estado=finalizada)
router.get('/', controller.obtenerTodasPartidas);
/**
 * @swagger
 * /api/partidas:
 *   post:
 *     summary: Crear una nueva partida
 *     tags: [Partidas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idCuestionario
 *               - idProfesor
 *             properties:
 *               idCuestionario:
 *                 type: string
 *               idProfesor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Partida creada exitosamente
 */
// GET /api/partidas/:id -> Ver detalles de una partida específica (por ID de BD, no PIN)
// IMPORTANTE: Esta ruta puede chocar con otras si no tienes cuidado con el orden. 
// Colócala después de las rutas específicas como /pin/:pin o /examen/...
router.get('/:id', controller.obtenerDetallePartida);

// PUT /api/partidas/:id -> Editar configuración (solo si está en 'espera')
router.put('/:id', controller.actualizarPartida);

// DELETE /api/partidas/:id -> Borrar partida y sus datos asociados
router.delete('/:id', controller.eliminarPartida);


// --- RUTAS DE JUEGO (LÓGICA) ---

// POST /api/partidas -> Crear nueva partida (Profesor)
router.post('/', controller.crearPartida);
/**
 * @swagger
 * /api/partidas/unirse/{pin}:
 *   post:
 *     summary: Unirse a una partida (Alumno)
 *     tags: [Partidas]
 *     parameters:
 *       - in: path
 *         name: pin
 *         required: true
 *         schema:
 *           type: string
 *         description: PIN de la partida
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idAlumno:
 *                 type: string
 *               nombreAlumno:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alumno unido exitosamente
 */
// POST /api/partidas/unirse/:pin -> Unirse a una partida (Alumno)
router.post('/unirse/:pin', controller.unirseAPartida);

// POST /api/partidas/responder -> Enviar respuesta
router.post('/responder', controller.enviarRespuesta);

// PUT /api/partidas/iniciar/:id -> Iniciar partida (Profesor - Trigger Start)
router.put('/iniciar/:id', controller.iniciarPartida);

// PUT /api/partidas/finalizar/:id -> Finalizar partida (Profesor - Manual Stop)
router.put('/finalizar/:id', controller.finalizarPartida);


// --- RUTAS DE CONSULTA AUXILIAR (ALUMNO) ---

// GET /api/partidas/pin/:pin -> Buscar partida por PIN
router.get('/pin/:pin', controller.obtenerPartidaPorPin);

// GET /api/partidas/examen/:idPartida/preguntas -> Descargar examen completo
router.get('/examen/:idPartida/preguntas', controller.obtenerPreguntasExamen);

module.exports = router;