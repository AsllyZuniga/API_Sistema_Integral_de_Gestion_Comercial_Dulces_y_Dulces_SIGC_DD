'use strict';

const { requireAuthJWT } = require('./authJwtMiddleware');

/**
 * Cadena de middlewares que exige autenticación JWT y rol de
 * administrador (id_rol = 1).
 *
 * Composición:
 *   1. requireAuthJWT — valida el token y carga req.auth
 *   2. Verificación inline — corta con 403 si el rol no es 1
 *
 * Uso típico: `router.use('/api/admin', requireAdmin)` o por ruta.
 */
const requireAdmin = [
    requireAuthJWT,
    (req, res, next) => {
        const idRol = req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol;
        if (String(idRol) !== '1') {
            return res.status(403).send({ message: 'Acceso restringido a administradores' });
        }
        return next();
    }
];

module.exports = { requireAdmin };
