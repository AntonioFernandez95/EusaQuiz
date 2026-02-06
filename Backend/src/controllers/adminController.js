const Usuario = require('../models/usuario');
const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Curso = require('../models/curso');
const Cuestionario = require('../models/cuestionario');
const Ajustes = require('../models/ajustes');
const tipos = require('../utils/constants');
const fs = require('fs');
const path = require('path');

const adminController = {
    /**
     * Obtener estadísticas globales y listas para el dashboard
     */
    getDashboardStats: async (req, res) => {
        try {
            const totalUsuarios = await Usuario.countDocuments();
            const totalPartidas = await Partida.countDocuments();
            const partidasActivas = await Partida.countDocuments({
                estadoPartida: { $in: [tipos.ESTADOS_PARTIDA.ACTIVA, tipos.ESTADOS_PARTIDA.ESPERA] }
            });

            // Usuarios recientes
            const usuariosRecientes = await Usuario.find()
                .populate('centro', 'nombre codigo')
                .populate('curso', 'nombre codigo')
                .sort({ creadoEn: -1 })
                .limit(5);

            // Cursos y Centros desde la base de datos
            const [cursos, centros, ajustes] = await Promise.all([
                Curso.find().populate('centro', 'nombre codigo').sort({ nombre: 1 }),
                require('../models/centro').find().sort({ nombre: 1 }),
                Ajustes.findOne()
            ]);

            // Si no hay ajustes, crear los por defecto
            let currentBranding = ajustes;
            if (!currentBranding) {
                currentBranding = await Ajustes.create({ nombreApp: 'CampusQuiz', logoAppUrl: 'assets/img/logo-camera.png' });
            }

            res.json({
                ok: true,
                stats: {
                    totalUsuarios,
                    totalPartidas,
                    partidasActivas
                },
                usuariosRecientes,
                config: {
                    cursos: cursos,
                    centros: centros,
                    branding: {
                        nombreApp: currentBranding.nombreApp,
                        logoAppUrl: currentBranding.logoAppUrl
                    }
                }
            });
        } catch (error) {
            console.error('Error en getDashboardStats:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener estadísticas', error: error.message });
        }
    },

    /**
     * Obtener detalle completo de un usuario (sus partidas, archivos, etc.)
     */
    getUserFullDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const usuario = await Usuario.findById(id);
            if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

            const participaciones = await Participacion.find({ idAlumno: usuario.idPortal || id })
                .populate('idPartida')
                .sort({ fecha: -1 });

            const partidasCreadas = await Partida.find({ idProfesor: usuario.idPortal || id })
                .sort({ fechaCreacion: -1 });

            res.json({
                ok: true,
                data: {
                    usuario,
                    participaciones,
                    partidasCreadas
                }
            });
        } catch (error) {
            console.error('Error en getUserFullDetail:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener detalle del usuario', error: error.message });
        }
    },

    /**
     * Listar todas las partidas del sistema
     */
    listAllGames: async (req, res) => {
        try {
            const partidas = await Partida.find()
                .populate('idCuestionario', 'titulo')
                .populate('profesor', 'nombre email')
                .sort({ 'fechas.creadaEn': -1 });

            res.json({
                ok: true,
                data: partidas
            });
        } catch (error) {
            console.error('Error en listAllGames:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al listar partidas', error: error.message });
        }
    },
    /**
     * Eliminar una partida
     */
    deleteGame: async (req, res) => {
        try {
            const { id } = req.params;
            const partida = await Partida.findByIdAndDelete(id);

            if (!partida) {
                return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });
            }

            // Opcionalmente eliminar participaciones asociadas
            await Participacion.deleteMany({ idPartida: id });

            res.json({
                ok: true,
                mensaje: 'Partida y participaciones eliminadas correctamente'
            });
        } catch (error) {
            console.error('Error en deleteGame:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al eliminar partida', error: error.message });
        }
    },

    /**
     * Actualizar configuración de una partida
     */
    updateGameConfig: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const partida = await Partida.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            );

            if (!partida) {
                return res.status(404).json({ ok: false, mensaje: 'Partida no encontrada' });
            }

            res.json({
                ok: true,
                data: partida,
                mensaje: 'Configuración de partida actualizada'
            });
        } catch (error) {
            console.error('Error en updateGameConfig:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al actualizar partida', error: error.message });
        }
    },

    /**
     * Obtener branding de la aplicación
     */
    getBranding: async (req, res) => {
        try {
            let ajustes = await Ajustes.findOne();
            if (!ajustes) {
                ajustes = await Ajustes.create({ nombreApp: 'CampusQuiz', logoAppUrl: 'assets/img/logo-camera.png' });
            }
            res.json({ ok: true, data: ajustes });
        } catch (error) {
            console.error('Error en getBranding:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener branding', error: error.message });
        }
    },

    /**
     * Actualizar branding de la aplicación
     */
    updateBranding: async (req, res) => {
        try {
            const { nombreApp } = req.body;
            let updateData = { nombreApp };

            if (req.file) {
                // Normalizar path para usar slashes / en lugar de \
                updateData.logoAppUrl = req.file.path.replace(/\\/g, '/');
            }

            let ajustes = await Ajustes.findOneAndUpdate(
                {},
                { $set: updateData },
                { new: true, upsert: true }
            );

            res.json({
                ok: true,
                data: ajustes,
                mensaje: 'Branding actualizado correctamente'
            });
        } catch (error) {
            console.error('Error en updateBranding:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al actualizar branding', error: error.message });
        }
    }
};

module.exports = adminController;
