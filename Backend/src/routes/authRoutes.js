const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoints de autenticación
router.get('/get-constants', authController.getConstants);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/sync-from-parent', authController.syncFromParent);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
