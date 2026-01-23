const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * /api/admin/branding:
 *   get:
 *     summary: Obtener configuración de branding (nombre y logo)
 *     tags: [Admin]
 */
router.get('/branding', controller.getBranding);

// Todas las rutas de admin requieren ser administrador
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Obtener estadísticas para el dashboard
 *     tags: [Admin]
 */
router.get('/stats', controller.getDashboardStats);

/**
 * @swagger
 * /api/admin/partidas:
 *   get:
 *     summary: Listar todas las partidas
 *     tags: [Admin]
 */
router.get('/partidas', controller.listAllGames);

/**
 * @swagger
 * /api/admin/partidas/{id}:
 *   put:
 *     summary: Actualizar configuración de partida
 *     tags: [Admin]
 */
router.put('/partidas/:id', controller.updateGameConfig);

/**
 * @swagger
 * /api/admin/partidas/{id}:
 *   delete:
 *     summary: Eliminar partida
 *     tags: [Admin]
 */
router.delete('/partidas/:id', controller.deleteGame);

/**
 * @swagger
 * /api/admin/usuarios/{id}:
 *   get:
 *     summary: Detalle completo de usuario
 *     tags: [Admin]
 */
router.get('/usuarios/:id', controller.getUserFullDetail);

/**
 * @swagger
 * /api/admin/branding:
 *   put:
 *     summary: Actualizar configuración de branding
 *     tags: [Admin]
 */
router.put('/branding', upload.single('logo'), controller.updateBranding);

module.exports = router;
