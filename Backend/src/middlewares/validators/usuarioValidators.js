const { check, validationResult } = require('express-validator');

const validarCampos = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, errors: errors.array() });
    }
    next();
};

exports.validarCrearUsuario = [
    check('email', 'El email es obligatorio y debe ser válido').isEmail(),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('idPortal', 'El ID del portal es obligatorio').not().isEmpty(),
    validarCampos // Middleware final que revisa si hubo errores
];