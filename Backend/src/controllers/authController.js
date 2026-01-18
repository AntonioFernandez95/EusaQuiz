const Usuario = require('../models/usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const authController = {
    /**
     * Registro de nuevo usuario
     */
    register: async (req, res) => {
        try {
            const { idPortal, nombre, email, password, rol, curso, centro } = req.body;

            // Restricción: No se permite registrar usuarios con rol 'admin' públicamente
            if (rol === 'admin') {
                return res.status(403).json({ ok: false, mensaje: 'No está permitido registrar un usuario administrador' });
            }

            // Si no viene idPortal, generamos uno local único
            const finalIdPortal = idPortal || `LOCAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Verificar si el usuario ya existe
            let user = await Usuario.findOne({ $or: [{ email }, { idPortal: finalIdPortal }] });
            if (user) {
                return res.status(400).json({ ok: false, mensaje: 'El usuario o email ya existe' });
            }

            // Haishear password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Crear nuevo usuario
            const nuevoUsuario = new Usuario({
                idPortal: finalIdPortal,
                nombre,
                email,
                password: hashedPassword,
                rol,
                curso,
                centro
            });

            await nuevoUsuario.save();

            // Generar JWT
            const token = jwt.sign(
                { id: nuevoUsuario._id, email: nuevoUsuario.email, rol: nuevoUsuario.rol },
                process.env.JWT_SECRET || 'secret_key',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                ok: true,
                token,
                user: {
                    _id: nuevoUsuario._id,
                    idPortal: nuevoUsuario.idPortal,
                    nombre: nuevoUsuario.nombre,
                    email: nuevoUsuario.email,
                    rol: nuevoUsuario.rol
                }
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
        }
    },

    /**
     * Login de usuario
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Buscar usuario
            const user = await Usuario.findOne({ email });
            if (!user || !user.password) {
                return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
            }

            // Verificar password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
            }

            // Generar JWT
            const token = jwt.sign(
                { id: user._id, email: user.email, rol: user.rol, nombre: user.nombre },
                process.env.JWT_SECRET || 'secret_key',
                { expiresIn: '24h' }
            );

            res.json({
                ok: true,
                token,
                user: {
                    _id: user._id,
                    idPortal: user.idPortal,
                    nombre: user.nombre,
                    email: user.email,
                    rol: user.rol
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
        }
    },

    /**
     * Sincronización desde portal padre (JWT externo)
     */
    syncFromParent: async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ ok: false, mensaje: 'Token requerido' });

            const payload = jwt.decode(token);
            if (!payload || !payload.email) {
                return res.status(400).json({ ok: false, mensaje: 'Token del portal inválido' });
            }

            // Buscar o crear usuario basado en la info del portal
            let user = await Usuario.findOne({ email: payload.email });
            if (!user) {
                user = new Usuario({
                    idPortal: payload.idPortal || `PORTAL_${Date.now()}`,
                    nombre: payload.nombre || payload.email.split('@')[0],
                    email: payload.email,
                    rol: payload.rol || 'alumno',
                    centro: payload.centro || 'EUSA',
                    curso: payload.curso || null
                });
                await user.save();
            }

            // Generar nuestro propio token de sesión
            const sessionToken = jwt.sign(
                { id: user._id, email: user.email, rol: user.rol },
                process.env.JWT_SECRET || 'secret_key',
                { expiresIn: '24h' }
            );

            res.json({
                ok: true,
                token: sessionToken,
                user: {
                    _id: user._id,
                    idPortal: user.idPortal,
                    nombre: user.nombre,
                    email: user.email,
                    rol: user.rol
                }
            });

        } catch (error) {
            console.error('Error en syncFromParent:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al sincronizar con el portal' });
        }
    },

    /**
     * Recuperación de contraseña
     */
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            const usuario = await Usuario.findOne({ email });

            // Por seguridad, si el usuario no existe, enviamos la misma respuesta
            if (!usuario) {
                return res.json({ ok: true, mensaje: 'Si el email existe, se han enviado las instrucciones' });
            }

            // Generar token aleatorio
            const token = crypto.randomBytes(20).toString('hex');

            // Guardar token y expiración (1 hora)
            usuario.resetPasswordToken = token;
            usuario.resetPasswordExpires = Date.now() + 3600000;
            await usuario.save();

            // Enviar email
            const emailSent = await emailService.sendResetPasswordEmail(usuario.email, token, usuario.nombre);

            if (!emailSent) {
                return res.status(500).json({ ok: false, mensaje: 'Error al enviar el correo de recuperación' });
            }

            res.json({ ok: true, mensaje: 'Si el email existe, se han enviado las instrucciones' });

        } catch (error) {
            console.error('Error en forgotPassword:', error);
            res.status(500).json({ ok: false, mensaje: 'Error interno al procesar la solicitud' });
        }
    },

    /**
     * Restablecer contraseña con token
     */
    resetPassword: async (req, res) => {
        try {
            const { token, password } = req.body;

            const usuario = await Usuario.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!usuario) {
                return res.status(400).json({ ok: false, mensaje: 'El token es inválido o ha expirado' });
            }

            // Haishear nueva password
            const salt = await bcrypt.genSalt(10);
            usuario.password = await bcrypt.hash(password, salt);

            // Limpiar campos de reset
            usuario.resetPasswordToken = null;
            usuario.resetPasswordExpires = null;

            await usuario.save();

            res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });

        } catch (error) {
            console.error('Error en resetPassword:', error);
            res.status(500).json({ ok: false, mensaje: 'Error interno al restablecer la contraseña' });
        }
    }
};

module.exports = authController;
