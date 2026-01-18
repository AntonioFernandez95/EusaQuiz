const { ROLES } = require('../utils/constants');

/**
 * Middleware para verificar si el usuario es administrador
 * Requiere que el usuario esté previamente autenticado (req.user debe estar presente)
 */
const isAdmin = (req, res, next) => {
    // Si usas un middleware de autenticación previo que guarda el usuario en req.user
    // el cual suele venir del payload del JWT.

    // NOTA: Como el sistema usa authFromParent para algunos casos, 
    // asegúrate de que el objeto user esté disponible.
    // Si el middleware de JWT ya se ejecutó, req.user debería existir.

    // Verificamos el rol directamente en el objeto de usuario/token decodificado
    const userRole = req.user?.rol || req.headers['x-user-role'];

    if (userRole === ROLES.ADMIN) {
        next();
    } else {
        return res.status(403).json({
            ok: false,
            mensaje: 'Acceso denegado: Se requieren permisos de administrador'
        });
    }
};

const isProfessorOrAdmin = (req, res, next) => {
    const userRole = req.user?.rol || req.headers['x-user-role'];

    if (userRole === ROLES.ADMIN || userRole === ROLES.PROFESOR) {
        next();
    } else {
        return res.status(403).json({
            ok: false,
            mensaje: 'Acceso denegado: Se requieren permisos de profesor o administrador'
        });
    }
};

module.exports = { isAdmin, isProfessorOrAdmin };
