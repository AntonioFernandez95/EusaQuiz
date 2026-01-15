const express = require('express');
const router = express.Router();
const controller = require('../controllers/importController');

/**
 * @swagger
 * /api/import/examen:
 *   post:
 *     summary: Importar un examen completo desde JSON
 *     tags: [Importación]
 */
router.post('/examen', controller.importarExamen);

module.exports = router;
