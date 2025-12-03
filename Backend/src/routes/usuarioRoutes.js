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
router.get('/', wrapHandler(controller.listarUsuarios));
router.get('/:id', wrapHandler(controller.obtenerUsuario));
router.post('/', validarCrearUsuario, wrapHandler(controller.crearUsuario));
router.put('/:id', wrapHandler(controller.actualizarUsuario));
router.delete('/:id', wrapHandler(controller.borrarUsuario));

module.exports = router;    