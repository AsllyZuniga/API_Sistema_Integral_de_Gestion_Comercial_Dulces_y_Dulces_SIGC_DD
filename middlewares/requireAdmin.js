'use strict';

const { requireAuthJWT } = require('./authJwtMiddleware');

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
