const Usuario = require('../models/usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {
    /**
     * Registro de nuevo usuario
     */
    register: async (req, res) => {
        try {
            const { idPortal, nombre, email, password, rol, curso, centro } = req.body;

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
     * Recuperación de contraseña (mockup)
     */
    forgotPassword: async (req, res) => {
        // En una implementación real enviaríamos un email con un token
        res.json({ ok: true, mensaje: 'Si el email existe, se han enviado las instrucciones' });
    }
};

module.exports = authController;
