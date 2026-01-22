const express = require('express');
const router = express.Router();
const controller = require('../controllers/datosAcademicosController');
const { isAdmin, isProfessorOrAdmin } = require('../middlewares/authMiddleware');

// ==================== RUTAS PÚBLICAS (lectura) ====================
// Estas rutas son accesibles para todos los usuarios autenticados

/**
 * @swagger
 * /api/datos-academicos:
 *   get:
 *     summary: Obtener todos los datos académicos (centros, cursos, asignaturas)
 *     tags: [Datos Académicos]
 */
router.get('/', controller.getAllDatosAcademicos);

/**
 * @swagger
 * /api/datos-academicos/centros:
 *   get:
 *     summary: Obtener todos los centros
 *     tags: [Datos Académicos]
 */
router.get('/centros', controller.getCentros);

/**
 * @swagger
 * /api/datos-academicos/cursos:
 *   get:
 *     summary: Obtener todos los cursos (filtrable por ?centro=id)
 *     tags: [Datos Académicos]
 */
router.get('/cursos', controller.getCursos);

/**
 * @swagger
 * /api/datos-academicos/asignaturas:
 *   get:
 *     summary: Obtener todas las asignaturas (filtrable por ?curso=id)
 *     tags: [Datos Académicos]
 */
router.get('/asignaturas', controller.getAsignaturas);

// ==================== RUTAS ADMIN (escritura) ====================
// Estas rutas solo son accesibles para administradores

// --- Centros ---
router.post('/centros', isAdmin, controller.createCentro);
router.put('/centros/:id', isAdmin, controller.updateCentro);
router.delete('/centros/:id', isAdmin, controller.deleteCentro);

// --- Cursos ---
router.post('/cursos', isAdmin, controller.createCurso);
router.put('/cursos/:id', isAdmin, controller.updateCurso);
router.delete('/cursos/:id', isAdmin, controller.deleteCurso);

// --- Asignaturas ---
router.post('/asignaturas', isAdmin, controller.createAsignatura);
router.put('/asignaturas/:id', isAdmin, controller.updateAsignatura);
router.delete('/asignaturas/:id', isAdmin, controller.deleteAsignatura);

module.exports = router;
