// src/controllers/cuestionarioController.js (TEMPORAL: ID directo del BODY/URL)
const Cuestionario = require('../models/cuestionario');

// 1. Crear un nuevo Cuestionario
exports.crearCuestionario = async (req, res) => {
    try {
        // AHORA leemos todos los campos, incluyendo idProfesor y centro, directamente del body.
        // Esto permite la prueba sin token.
        const quizData = req.body;

        // Mongoose ahora validará que idProfesor y centro EXISTAN en quizData
        const nuevoQuiz = new Cuestionario(quizData);
        const quizGuardado = await nuevoQuiz.save();

        res.status(201).json({
            ok: true,
            mensaje: 'Cuestionario creado con éxito',
            data: quizGuardado
        });

    } catch (error) {
        console.error("Error de validación o servidor:", error);
        res.status(500).json({
            ok: false,
            // Dejamos que el error de Mongoose muestre exactamente qué campo falta
            mensaje: 'Error al guardar el cuestionario',
            error: error.message
        });
    }
};

// 2. Obtener cuestionarios de un profesor específico
exports.obtenerMisCuestionarios = async (req, res) => {
    try {
        // AHORA obtenemos el ID del profesor desde el parámetro de la URL (:idProfesor)
        const { idProfesor } = req.params;

        const quizzes = await Cuestionario.find({ idProfesor: idProfesor });

        res.json({
            ok: true,
            total: quizzes.length,
            data: quizzes
        });

    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener cuestionarios' });
    }
};

// 3. Obtener un cuestionario por ID (Para jugar)
exports.obtenerPorId = async (req, res) => {
    try {
        const quiz = await Cuestionario.findById(req.params.id);
        if (!quiz) return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado' });

        res.json({ ok: true, data: quiz });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error del servidor' });
    }
};
// 4. Actualizar contadores (numPreguntas, numVecesJugado)
exports.actualizarContadoresCuestionario = async (req, res) => {
    const { id } = req.params; // ID del cuestionario
    const { numPreguntas, numVecesJugado } = req.body; // Valores a incrementar (ej: 1, -1)

    // Construir el objeto de actualización con el operador $inc
    const updates = {};

    if (numPreguntas !== undefined) {
        // Solo incluimos el campo si se proporciona en el body
        updates.numPreguntas = numPreguntas;
    }
    if (numVecesJugado !== undefined) {
        updates.numVecesJugado = numVecesJugado;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            ok: false,
            mensaje: 'No se proporcionaron campos para actualizar los contadores.'
        });
    }

    try {
        const cuestionarioActualizado = await Cuestionario.findByIdAndUpdate(
            id,
            { ...datosActualizar, actualizadoEn: Date.now() },
            { new: true }
        );

        if (!cuestionarioActualizado) {
            return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado.' });
        }

        res.json({
            ok: true,
            mensaje: 'Contadores actualizados con éxito.',
            data: cuestionarioActualizado
        });

    } catch (error) {
        console.error("Error al actualizar contadores:", error);
        res.status(500).json({ ok: false, mensaje: 'Error interno del servidor al actualizar contadores.' });
    }
};
// 5. Obtener TODOS los cuestionarios (Con opción de búsqueda/filtros)
exports.obtenerTodos = async (req, res) => {
    try {
        // Podemos filtrar por query params. Ej: ?asignatura=Matematicas&titulo=Examen
        const { asignatura, busqueda } = req.query;

        let filtro = {};

        // Si viene asignatura, filtramos por ella
        if (asignatura) {
            filtro.asignatura = asignatura;
        }

        // Si viene búsqueda, buscamos en el título (usando regex para búsqueda parcial)
        if (busqueda) {
            filtro.titulo = { $regex: busqueda, $options: 'i' }; // 'i' = insensibile a mayúsculas
        }

        // Solo devolvemos los que no estén archivados o borrados (opcional)
        // filtro.estado = 'activo'; 

        const cuestionarios = await Cuestionario.find(filtro)
            .sort({ creadoEn: -1 }); // Más recientes primero

        res.json({
            ok: true,
            total: cuestionarios.length,
            data: cuestionarios
        });

    } catch (error) {
        console.error("Error al obtener cuestionarios:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 6. Actualizar (Editar) un Cuestionario
exports.actualizarCuestionario = async (req, res) => {
    const { id } = req.params;
    const datosActualizar = req.body;

    try {
        // Buscamos y actualizamos. { new: true } devuelve el objeto ya cambiado
        const cuestionarioActualizado = await Cuestionario.findByIdAndUpdate(
            id,
            { ...datosActualizar, actualizadoEn: Date.now() },
            { new: true }
        );

        if (!cuestionarioActualizado) {
            return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado' });
        }

        res.json({
            ok: true,
            mensaje: 'Cuestionario actualizado correctamente',
            data: cuestionarioActualizado
        });

    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 7. Eliminar un Cuestionario
exports.eliminarCuestionario = async (req, res) => {
    const { id } = req.params;

    try {
        const cuestionarioEliminado = await Cuestionario.findByIdAndDelete(id);

        if (!cuestionarioEliminado) {
            return res.status(404).json({ ok: false, mensaje: 'Cuestionario no encontrado' });
        }

        res.json({
            ok: true,
            mensaje: 'Cuestionario eliminado permanentemente',
            data: { id: cuestionarioEliminado._id, titulo: cuestionarioEliminado.titulo }
        });

    } catch (error) {
        console.error("Error al eliminar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};