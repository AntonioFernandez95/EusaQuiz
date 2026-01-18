const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de admin requieren ser administrador
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Obtener estadísticas globales del sistema
 *     tags: [Admin]
 */
router.get('/stats', controller.getDashboardStats);

/**
 * @swagger
 * /api/admin/usuarios/{id}:
 *   get:
 *     summary: Obtener detalle completo de un usuario (partidas, participaciones)
 *     tags: [Admin]
 */
router.get('/usuarios/:id', controller.getUserFullDetail);

/**
 * @swagger
 * /api/admin/partidas:
 *   get:
 *     summary: Listar todas las partidas del sistema
 *     tags: [Admin]
 */
router.get('/partidas', controller.listAllGames);
router.delete('/partidas/:id', controller.deleteGame);
router.put('/partidas/:id', controller.updateGameConfig);

module.exports = router;
