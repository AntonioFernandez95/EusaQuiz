const express = require('express');
const router = express.Router();
const controller = require('../controllers/preguntaController');

// --- RUTAS DE LECTURA ---
/**
 * @swagger
 * /api/preguntas/cuestionarios/{idCuestionario}:
 *   get:
 *     summary: Obtener todas las preguntas de un cuestionario
 *     description: Devuelve todas las preguntas asociadas a un cuestionario específico, ordenadas por su posición.
 *     tags: [Preguntas]
 *     parameters:
 *       - in: path
 *         name: idCuestionario
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cuestionario padre
 *         example: 64a7b2c3d4e5f6789
 *     responses:
 *       200:
 *         description: Lista de preguntas del cuestionario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pregunta'
 *       400:
 *         description: idCuestionario inválido
 *       500:
 *         description: Error del servidor
 */
// GET /api/preguntas/cuestionarios/:idCuestionario -> Todas las de un quiz
router.get('/cuestionarios/:idCuestionario', controller.obtenerPreguntasPorCuestionario);
/**
 * @swagger
 * /api/preguntas/{id}:
 *   get:
 *     summary: Obtener una pregunta por ID
 *     description: Devuelve los detalles de una pregunta específica, incluyendo sus opciones.
 *     tags: [Preguntas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la pregunta
 *         example: 64a7b2c3d4e5f6790
 *     responses:
 *       200:
 *         description: Pregunta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Pregunta'
 *       404:
 *         description: Pregunta no encontrada
 *       500:
 *         description: Error del servidor
 */
// GET /api/preguntas/:id -> Obtener una sola (para editar)
router.get('/:id', controller.obtenerPreguntaPorId);


// --- RUTAS DE ESCRITURA ---
/**
 * @swagger
 * /api/preguntas:
 *   post:
 *     summary: Crear una nueva pregunta
 *     description: Crea una nueva pregunta y la vincula a un cuestionario.  Incrementa automáticamente el contador de preguntas del cuestionario. 
 *     tags: [Preguntas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreguntaInput'
 *           example:
 *             idCuestionario: "64a7b2c3d4e5f6789"
 *             textoPregunta: "¿Qué método usa Mongoose para guardar?"
 *             tipoPregunta: "unica"
 *             puntuacionMax: 1000
 *             tiempoLimiteSeg: 20
 *             ordenPregunta: 1
 *             opciones:
 *               - textoOpcion: ".save()"
 *                 esCorrecta: true
 *                 orden: 1
 *               - textoOpcion: ".insert()"
 *                 esCorrecta: false
 *                 orden: 2
 *               - textoOpcion: ".create()"
 *                 esCorrecta: false
 *                 orden: 3
 *               - textoOpcion: ".push()"
 *                 esCorrecta: false
 *                 orden: 4
 *     responses:
 *       201:
 *         description: Pregunta creada exitosamente
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
 *                   example: "Pregunta creada y vinculada con éxito."
 *                 data:
 *                   $ref: '#/components/schemas/Pregunta'
 *       400:
 *         description: Datos inválidos o faltantes
 *       500:
 *         description: Error del servidor
 */
// POST /api/preguntas -> Crear nueva
router.post('/', controller.crearPregunta);
/**
 * @swagger
 * /api/preguntas/{id}:
 *   put:
 *     summary: Actualizar una pregunta
 *     description: Actualiza el contenido de una pregunta existente (texto, opciones, puntuación, etc.)
 *     tags: [Preguntas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la pregunta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               textoPregunta:
 *                 type: string
 *               tipoPregunta:
 *                 type: string
 *                 enum: [unica, multiple, V/F]
 *               opciones:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Opcion'
 *               puntuacionMax:
 *                 type: integer
 *               tiempoLimiteSeg:
 *                 type: integer
 *           example:
 *             textoPregunta: "¿Cuál es el método correcto para guardar en Mongoose?"
 *             puntuacionMax: 1500
 *     responses:
 *       200:
 *         description: Pregunta actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Pregunta'
 *       404:
 *         description: Pregunta no encontrada
 *       500:
 *         description: Error del servidor
 */
// PUT /api/preguntas/:id -> Editar pregunta
router.put('/:id', controller.actualizarPregunta);
/**
 * @swagger
 * /api/preguntas/{id}:
 *   delete:
 *     summary: Eliminar una pregunta
 *     description: Elimina una pregunta y decrementa automáticamente el contador de preguntas del cuestionario.
 *     tags: [Preguntas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la pregunta a eliminar
 *     responses:
 *       200:
 *         description: Pregunta eliminada exitosamente
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
 *                   example: "Pregunta eliminada con éxito."
 *       404:
 *         description: Pregunta no encontrada
 *       500:
 *         description: Error del servidor
 */
// DELETE /api/preguntas/:id -> Borrar pregunta (y baja el contador del quiz)
router.delete('/:id', controller.eliminarPregunta);

module.exports = router;