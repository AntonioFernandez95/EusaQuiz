/**
 * Rutas de usuarios, delgadas: validaciones como middlewares, controller como handler.
 * Usa wrapHandler para capturar errores async y delegarlos al error handler de Express.
 *
 * Importante:
 * - Ajusta la ruta de validarCrearUsuario si está en distinto path.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');
const { validarCrearUsuario } = require('../middlewares/validators/usuarioValidators');

// wrapper que soporta handlers async y evita repeats en cada ruta
function wrapHandler(fn) {
  if (typeof fn !== 'function') {
    return (req, res) => res.status(501).json({ ok: false, mensaje: 'Handler no implementado' });
  }
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rutas CRUD
/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Listar todos los usuarios
 *     description: Devuelve una lista paginada de usuarios del sistema.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de usuarios a devolver
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de usuarios a saltar (para paginación)
 *     responses:
 *       200:
 *         description: Lista de usuarios
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
 *                     $ref: '#/components/schemas/Usuario'
 *       500:
 *         description: Error del servidor
 */
router.get('/', wrapHandler(controller.listarUsuarios));
/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     description: Devuelve los detalles de un usuario específico.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario (ObjectId de MongoDB)
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', wrapHandler(controller.obtenerUsuario));
/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Crear un nuevo usuario
 *     description: Registra un nuevo usuario en el sistema (profesor o alumno). 
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *           example:
 *             idPortal: "PROFE_02"
 *             nombre: "María López"
 *             email: "maria@eusa.es"
 *             rol: "profesor"
 *             curso: "2 DAM"
 *             centro: "EUSA"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Datos inválidos o faltantes
 *       409:
 *         description: Email o idPortal ya existe
 *       500:
 *         description: Error del servidor
 */
router.post('/', validarCrearUsuario, wrapHandler(controller.crearUsuario));
/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar un usuario
 *     description: Actualiza los datos de un usuario existente.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               curso:
 *                 type: string
 *               centro:
 *                 type: string
 *               activo:
 *                 type: boolean
 *           example:
 *             nombre: "María López García"
 *             curso: "2 DAM"
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', wrapHandler(controller.actualizarUsuario));
/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Elimina un usuario del sistema. 
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
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
 *                   example: "Usuario eliminado"
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', wrapHandler(controller.borrarUsuario));

module.exports = router;    