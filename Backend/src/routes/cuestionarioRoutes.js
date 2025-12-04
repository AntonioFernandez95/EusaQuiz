const express = require('express');
const router = express.Router();
const controller = require('../controllers/cuestionarioController');
// =============================================
// SCHEMAS (para referencia en este archivo)
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     CuestionarioResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Cuestionario'
 */
// --- RUTAS DE LECTURA ---

// GET /api/cuestionarios -> Obtener todos (o filtrar por ?asignatura=X)
// ¡IMPORTANTE! Pon esta ruta ANTES de /:id para evitar conflictos

/**
 * @swagger
 * /api/cuestionarios:
 *   get:
 *     summary: Obtener todos los cuestionarios
 *     description: Devuelve todos los cuestionarios.  Se puede filtrar por asignatura o término de búsqueda. 
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: query
 *         name: asignatura
 *         schema:
 *           type: string
 *         description: Filtrar por asignatura
 *         example: Programación
 *       - in: query
 *         name: busqueda
 *         schema:
 *           type: string
 *         description: Término de búsqueda en título o descripción
 *     responses:
 *       200:
 *         description: Lista de cuestionarios obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Cuestionario'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', controller.obtenerTodos);
/**
 * @swagger
 * /api/cuestionarios/profesor/{idProfesor}:
 *   get:
 *     summary: Obtener cuestionarios de un profesor
 *     description: Devuelve todos los cuestionarios creados por un profesor específico.
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: path
 *         name: idProfesor
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del profesor
 *         example: PROFE_01
 *     responses:
 *       200:
 *         description: Lista de cuestionarios del profesor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cuestionario'
 *       400:
 *         description: idProfesor es requerido
 *       500:
 *         description: Error del servidor
 */
// GET /api/cuestionarios/profesor/:idProfesor
router.get('/profesor/:idProfesor', controller.obtenerMisCuestionarios);
/**
 * @swagger
 * /api/cuestionarios/{id}:
 *   get:
 *     summary: Obtener un cuestionario por ID
 *     description: Devuelve los detalles de un cuestionario específico. 
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cuestionario (ObjectId de MongoDB)
 *         example: 64a7b2c3d4e5f6789
 *     responses:
 *       200:
 *         description: Cuestionario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuestionario'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cuestionario no encontrado
 *       500:
 *         description: Error del servidor
 */
// GET /api/cuestionarios/:id
router.get('/:id', controller.obtenerPorId);


// --- RUTAS DE ESCRITURA ---
/**
 * @swagger
 * /api/cuestionarios:
 *   post:
 *     summary: Crear un nuevo cuestionario
 *     description: Crea un nuevo cuestionario vacío (sin preguntas inicialmente).
 *     tags: [Cuestionarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CuestionarioInput'
 *           example:
 *             titulo: "Examen Final JS"
 *             descripcion: "Preguntas sobre Mongoose y Node"
 *             asignatura: "Programación"
 *             curso: "1 DAM"
 *             centro: "EUSA"
 *             idProfesor: "PROFE_01"
 *             origen: "manual"
 *     responses:
 *       201:
 *         description: Cuestionario creado exitosamente
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
 *                   example: "Cuestionario creado con éxito."
 *                 data:
 *                   $ref: '#/components/schemas/Cuestionario'
 *       400:
 *         description: Datos inválidos o faltantes
 *       500:
 *         description: Error del servidor
 */
// POST /api/cuestionarios -> Crear
router.post('/', controller.crearCuestionario);
/**
 * @swagger
 * /api/cuestionarios/{id}:
 *   put:
 *     summary: Actualizar un cuestionario
 *     description: Actualiza la información general de un cuestionario (título, descripción, config, etc.)
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cuestionario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               asignatura:
 *                 type: string
 *           example:
 *             titulo: "Examen Final JS - Actualizado"
 *             descripcion: "Nueva descripción"
 *     responses:
 *       200:
 *         description: Cuestionario actualizado exitosamente
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
 *                   $ref: '#/components/schemas/Cuestionario'
 *       404:
 *         description: Cuestionario no encontrado
 *       500:
 *         description: Error del servidor
 */
// PUT /api/cuestionarios/:id -> Editar información general (Título, config, etc.)
router.put('/:id', controller.actualizarCuestionario);
/**
 * @swagger
 * /api/cuestionarios/{id}:
 *   delete:
 *     summary: Eliminar un cuestionario
 *     description: Elimina un cuestionario y todas sus preguntas asociadas.
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cuestionario a eliminar
 *     responses:
 *       200:
 *         description: Cuestionario eliminado exitosamente
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
 *                   example: "Cuestionario eliminado con éxito."
 *       404:
 *         description: Cuestionario no encontrado
 *       500:
 *         description: Error del servidor
 */
// DELETE /api/cuestionarios/:id -> Borrar cuestionario
router.delete('/:id', controller.eliminarCuestionario);
/**
 * @swagger
 * /api/cuestionarios/contadores/{id}:
 *   put:
 *     summary: Actualizar contadores del cuestionario
 *     description: Actualiza los contadores internos (numPreguntas, numVecesJugado).  Uso interno del sistema.
 *     tags: [Cuestionarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cuestionario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numPreguntas:
 *                 type: integer
 *               numVecesJugado:
 *                 type: integer
 *           example:
 *             numPreguntas: 15
 *             numVecesJugado: 10
 *     responses:
 *       200:
 *         description: Contadores actualizados
 *       500:
 *         description: Error del servidor
 */
// Ruta especial para contadores (Uso interno del juego)
router.put('/contadores/:id', controller.actualizarContadoresCuestionario);

module.exports = router;