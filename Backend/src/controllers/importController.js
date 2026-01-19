const importService = require('../services/importService');

exports.importarExamen = async (req, res) => {
    try {
        const data = await importService.importExamen(req.body);
        res.status(201).json({
            ok: true,
            mensaje: 'Examen importado correctamente',
            data
        });
    } catch (err) {
        console.error('Error importando examen:', err);
        
        // Manejar errores de validación de Mongoose
        let errorMessage = err.message || 'Error al importar el examen';
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            errorMessage = `Error de validación: ${messages.join(', ')}`;
        }
        
        res.status(500).json({
            ok: false,
            error: errorMessage
        });
    }
};
