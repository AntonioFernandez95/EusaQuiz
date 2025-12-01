const Usuario = require('../models/usuario');

// 1. Crear usuario (O "Registrar" la primera vez que entran)
exports.crearUsuario = async (req, res) => {
    try {
        const { idPortal, email } = req.body;

        // Verificamos duplicados
        const existe = await Usuario.findOne({ $or: [{ idPortal }, { email }] });
        if (existe) {
            return res.status(400).json({ ok: false, mensaje: 'El usuario ya existe (ID o Email duplicado).' });
        }

        const nuevoUsuario = new Usuario(req.body);
        await nuevoUsuario.save();

        res.status(201).json({
            ok: true,
            mensaje: 'Usuario registrado correctamente',
            data: nuevoUsuario
        });

    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 2. Obtener TODOS los usuarios (Con Filtros)
exports.obtenerUsuarios = async (req, res) => {
    try {
        const { rol, busqueda, activo } = req.query;
        
        let filtro = {};

        // Filtro por Rol (ej: ?rol=profesor)
        if (rol) {
            filtro.rol = rol;
        }

        // Filtro por Estado (ej: ?activo=true)
        if (activo !== undefined) {
            filtro.activo = activo === 'true';
        }

        // Búsqueda por Nombre o Email (ej: ?busqueda=juan)
        if (busqueda) {
            filtro.$or = [
                { nombre: { $regex: busqueda, $options: 'i' } },
                { email: { $regex: busqueda, $options: 'i' } },
                { idPortal: { $regex: busqueda, $options: 'i' } }
            ];
        }

        const usuarios = await Usuario.find(filtro)
                                      .sort({ nombre: 1 }); // Orden alfabético

        res.json({
            ok: true,
            total: usuarios.length,
            data: usuarios
        });

    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 3. Obtener Usuario por ID de Base de Datos
exports.obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const usuario = await Usuario.findById(id);
        if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        res.json({ ok: true, data: usuario });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 4. Obtener Usuario por ID PORTAL (Muy útil para integraciones)
exports.obtenerPorIdPortal = async (req, res) => {
    const { idPortal } = req.params;
    try {
        const usuario = await Usuario.findOne({ idPortal });
        if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        res.json({ ok: true, data: usuario });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 5. Actualizar Usuario
exports.actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            id, 
            { ...req.body, actualizadoEn: Date.now() },
            { new: true }
        );

        if (!usuarioActualizado) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

        res.json({
            ok: true,
            mensaje: 'Usuario actualizado',
            data: usuarioActualizado
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 6. Eliminar (Borrado lógico preferiblemente, o físico)
exports.eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const usuarioEliminado = await Usuario.findByIdAndDelete(id);
        if (!usuarioEliminado) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

        res.json({ ok: true, mensaje: 'Usuario eliminado del sistema', data: usuarioEliminado });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};