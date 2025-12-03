// Middleware: authFromParent
// - Extrae el JWT recibido desde la app padre (Authorization: Bearer <token>, x-access-token, query, body).
// - NO verifica la firma (por falta de secreto público), únicamente decodifica el payload con jwt.decode.
// - Pone el payload en req.user si existe, o deja req.user undefined si no hay token o no se puede decodificar.
// - Rutas protegidas deben comprobar req.user y rechazar si no existe.
//
// NOTA de seguridad:
// - Decodificar sin verificar permite leer el payload, pero NO garantiza que el token sea auténtico.
// - Si en el futuro tenéis la clave pública o secret, podemos cambiar jwt.decode -> jwt.verify para verificar la firma.
//
// Requiere: npm install jsonwebtoken

const jwt = require('jsonwebtoken');

/**
 * Extrae token del header, query o body.
 */
function extractTokenFromReq(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
  }
  if (req.headers['x-access-token']) return req.headers['x-access-token'];
  if (req.query && req.query.token) return req.query.token;
  if (req.body && req.body.token) return req.body.token;
  return null;
}

/**
 * Middleware principal.
 * Decodifica el token sin verificar la firma y setea req.user = payload | undefined
 */
module.exports = function authFromParent(req, res, next) {
  try {
    const token = extractTokenFromReq(req);
    if (!token) {
      // No token -> continuar sin usuario
      return next();
    }

    // Decodificamos sin verificar la firma (según decisión de no disponer de secreto)
    try {
      const payload = jwt.decode(token, { complete: false });
      if (payload && typeof payload === 'object') {
        req.user = payload;
      } else {
        req.user = undefined;
      }
    } catch (decodeErr) {
      console.warn('authFromParent: token decode failed. Token ignored.');
      req.user = undefined;
    }

    return next();
  } catch (err) {
    console.error('authFromParent middleware error:', err);
    req.user = undefined;
    return next();
  }
};