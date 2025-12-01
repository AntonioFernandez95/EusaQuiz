const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
const mongoose = require('mongoose');

// 1. Crear una nueva pregunta y actualizar el contador del cuestionario
exports.crearPregunta = async (req, res) => {
    // Nota: Aquí se asume que el idCuestionario viene en el body.
    const { idCuestionario, ...preguntaData } = req.body;

    // Validación básica
    if (!mongoose.Types.ObjectId.isValid(idCuestionario)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de Cuestionario inválido.' });
    }

    try {
        // 1. Crear el documento de la pregunta
        const nuevaPregunta = new Pregunta({ idCuestionario, ...preguntaData });
        const preguntaGuardada = await nuevaPregunta.save();

        // 2. Actualizar la métrica interna numPreguntas en el Cuestionario
        await Cuestionario.findByIdAndUpdate(idCuestionario, {
            $inc: { numPreguntas: 1 }, // Incrementa el contador en 1
            actualizadoEn: Date.now() // Actualiza la fecha de modificación
        });

        res.status(201).json({
            ok: true,
            mensaje: 'Pregunta creada y vinculada con éxito.',
            data: preguntaGuardada
        });

    } catch (error) {
        console.error("Error al crear pregunta y actualizar cuestionario:", error);
        res.status(500).json({ ok: false, mensaje: 'Error interno del servidor al guardar la pregunta.', error: error.message });
    }
};

// 2. Obtener todas las preguntas de un Cuestionario (para edición o para lanzar el juego)
exports.obtenerPreguntasPorCuestionario = async (req, res) => {
    const { idCuestionario } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idCuestionario)) {
        return res.status(400).json({ ok: false, mensaje: 'ID de Cuestionario inválido.' });
    }

    try {
        // Buscar todas las preguntas asociadas al idCuestionario [cite: 89]
        const preguntas = await Pregunta.find({ idCuestionario: idCuestionario })
            .sort({ ordenPregunta: 1 }); // Ordenar por posición [cite: 100]

        res.json({
            ok: true,
            total: preguntas.length,
            data: preguntas
        });

    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener las preguntas.' });
    }
};
// 3. Obtener una pregunta individual por ID (Para cargarla en el formulario de edición)
exports.obtenerPreguntaPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const pregunta = await Pregunta.findById(id);

        if (!pregunta) {
            return res.status(404).json({ ok: false, mensaje: 'Pregunta no encontrada.' });
        }

        res.json({ ok: true, data: pregunta });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 4. Actualizar (Editar) una pregunta
exports.actualizarPregunta = async (req, res) => {
    const { id } = req.params;
    const datosActualizar = req.body;

    try {
        // Actualizamos la pregunta
        const preguntaActualizada = await Pregunta.findByIdAndUpdate(
            id,
            datosActualizar,
            { new: true } // Para que devuelva el dato ya cambiado
        );

        if (!preguntaActualizada) {
            return res.status(404).json({ ok: false, mensaje: 'Pregunta no encontrada.' });
        }

        // Opcional: Actualizar la fecha de modificación del Cuestionario padre también
        await Cuestionario.findByIdAndUpdate(preguntaActualizada.idCuestionario, {
            actualizadoEn: Date.now()
        });

        res.json({
            ok: true,
            mensaje: 'Pregunta actualizada correctamente',
            data: preguntaActualizada
        });

    } catch (error) {
        console.error("Error al actualizar pregunta:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

// 5. Eliminar una pregunta (Y actualizar contador del padre)
exports.eliminarPregunta = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Borramos la pregunta y obtenemos el documento borrado (para saber quién era su padre)
        const preguntaEliminada = await Pregunta.findByIdAndDelete(id);

        if (!preguntaEliminada) {
            return res.status(404).json({ ok: false, mensaje: 'Pregunta no encontrada.' });
        }

        // 2. IMPORTANTE: Decrementar el contador en el Cuestionario padre
        await Cuestionario.findByIdAndUpdate(preguntaEliminada.idCuestionario, {
            $inc: { numPreguntas: -1 }, // Restamos 1
            actualizadoEn: Date.now()
        });

        res.json({
            ok: true,
            mensaje: 'Pregunta eliminada y contador actualizado.',
            data: { id: preguntaEliminada._id }
        });

    } catch (error) {
        console.error("Error al eliminar pregunta:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};