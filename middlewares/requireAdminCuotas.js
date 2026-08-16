'use strict';

const { requireAuthJWT } = require('./authJwtMiddleware');

/**
 * Middleware compuesto: autenticación JWT + rol administrador (id_rol = 1)
 * + permiso de acceso al módulo de cuotas (usuario.acceso_cuotas).
 *
 * El token JWT ya expone `accesoCuotas` como booleano; el fallback
 * `!== false` mantiene compatibilidad con tokens legacy que no incluyan
 * el claim.
 *
 * Uso típico: endpoints de edición de cuotas.
 */
const requireAdminCuotas = [
    requireAuthJWT,
    (req, res, next) => {
        const idRol = req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol;
        if (String(idRol) !== '1') {
            return res.status(403).send({
                success: false,
                message: 'Acceso restringido a administradores'
            });
        }

        if (req.auth?.accesoCuotas === false) {
            return res.status(403).send({
                success: false,
                message: 'Sin acceso al módulo de gestión de cuotas'
            });
        }

        return next();
    }
];

module.exports = { requireAdminCuotas };
