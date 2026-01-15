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
        res.status(500).json({
            ok: false,
            error: err.message || 'Error al importar el examen'
        });
    }
};
