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
/**
 * @swagger
 * /api/partidas:
 *   post:
 *     summary: Crear una nueva partida
 *     description: Crea una nueva partida/sala de juego. Genera automáticamente un PIN único de 6 dígitos.
 *     tags: [Partidas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartidaInput'
 *           example:
 *             idCuestionario: "64a7b2c3d4e5f6789"
 *             idProfesor: "PROFE_01"
 *             tipoPartida: "en_vivo"
 *             modoAcceso: "publica"
 *             configuracionEnvivo:
 *               tiempoPorPreguntaSeg: 20
 *               mostrarRanking: true
 *               mezclarPreguntas: true
 *               mezclarRespuestas: true
 *     responses:
 *       201:
 *         description: Partida creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 mensaje:
 *                   type: string
 *                   example: "Partida creada"
 *                 data:
 *                   type: object
 *                   properties:
 *                     partida:
 *                       $ref: '#/components/schemas/Partida'
 *                     pin:
 *                       type: string
 *                       example: "123456"
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */
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
/**
 * @swagger
 * /api/partidas/responder:
 *   post:
 *     summary: Enviar respuesta a una pregunta
 *     description: El alumno envía su respuesta a la pregunta actual. Calcula puntos según tiempo y precisión.
 *     tags: [Partidas]
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
 *             tiempoEmpleado: 5
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
 *                     puntuacionTotal:
 *                       type: integer
 *       400:
 *         description: Ya respondida o datos inválidos
 *       500:
 *         description: Error del servidor
 */
// POST /api/partidas/responder -> Enviar respuesta
router.post('/responder', controller.enviarRespuesta);
/**
 * @swagger
 * /api/partidas/iniciar/{id}:
 *   put:
 *     summary: Iniciar una partida
 *     description: El profesor inicia la partida. Cambia el estado a "activa" y emite evento Socket.io "partida-iniciada". 
 *     tags: [Partidas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la partida a iniciar
 *     responses:
 *       200:
 *         description: Partida iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 primeraPregunta:
 *                   $ref: '#/components/schemas/Pregunta'
 *       400:
 *         description: La partida ya está en curso o finalizada
 *       404:
 *         description: Partida no encontrada
 *       500:
 *         description: Error del servidor
 */
// PUT /api/partidas/iniciar/:id -> Iniciar partida (Profesor - Trigger Start)
router.put('/iniciar/:id', controller.iniciarPartida);
/**
 * @swagger
 * /api/partidas/finalizar/{id}:
 *   put:
 *     summary: Finalizar una partida
 *     description: El profesor finaliza manualmente la partida.  Cambia el estado a "finalizada" y emite evento Socket.io "partida-finalizada".
 *     tags: [Partidas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la partida a finalizar
 *     responses:
 *       200:
 *         description: Partida finalizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Partida no encontrada
 *       500:
 *         description: Error del servidor
 */
// PUT /api/partidas/finalizar/:id -> Finalizar partida (Profesor - Manual Stop)
router.put('/finalizar/:id', controller.finalizarPartida);


// --- RUTAS DE CONSULTA AUXILIAR (ALUMNO) ---

// GET /api/partidas/pin/:pin -> Buscar partida por PIN
router.get('/pin/:pin', controller.obtenerPartidaPorPin);

// GET /api/partidas/examen/:idPartida/preguntas -> Descargar examen completo
router.get('/examen/:idPartida/preguntas', controller.obtenerPreguntasExamen);

/**
 * @swagger
 * /api/partidas/{id}/reporte:
 *   get:
 *     summary: Generar reporte de partida
 *     description: Genera un reporte de la partida finalizada en formato XML o HTML (transformado con XSLT). Incluye ranking de jugadores y estadísticas por pregunta.
 *     tags: [Partidas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la partida
 *       - in: query
 *         name: formato
 *         schema:
 *           type: string
 *           enum: [xml, html]
 *           default: html
 *         description: Formato del reporte (xml o html)
 *     responses:
 *       200:
 *         description: Reporte generado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *           application/xml:
 *             schema:
 *               type: string
 *       400:
 *         description: Formato inválido
 *       404:
 *         description: Partida no encontrada
 *       500:
 *         description: Error del servidor
 */
// GET /api/partidas/:id/reporte -> Generar reporte XSLT
router.get('/:id/reporte', controller.generarReporte);

module.exports = router;