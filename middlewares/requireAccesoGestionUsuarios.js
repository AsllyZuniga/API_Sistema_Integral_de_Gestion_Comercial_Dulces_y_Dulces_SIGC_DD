'use strict';

const { requireAuthJWT } = require('./authJwtMiddleware');

/**
 * Cadena de middlewares que exige autenticación JWT, rol de administrador
 * (id_rol = 1) y el permiso granular accesoGestionUsuarios (habilitado por
 * defecto; solo bloquea si quedó explícitamente en false).
 *
 * El guard de ruta del front oculta el menú y bloquea la navegación a
 * /gestion-usuarios para admins restringidos, pero eso no protege la API:
 * sin esto, un admin restringido podía seguir llamando estos endpoints
 * directo (curl, Postman) aunque no viera el link en el sidebar.
 */
const requireAccesoGestionUsuarios = [
    requireAuthJWT,
    (req, res, next) => {
        const idRol = req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol;
        if (String(idRol) !== '1') {
            return res.status(403).send({ message: 'Acceso restringido a administradores' });
        }
        if (req.auth?.accesoGestionUsuarios === false) {
            return res.status(403).send({ message: 'No tienes permiso para gestionar usuarios' });
        }
        return next();
    }
];

module.exports = { requireAccesoGestionUsuarios };
