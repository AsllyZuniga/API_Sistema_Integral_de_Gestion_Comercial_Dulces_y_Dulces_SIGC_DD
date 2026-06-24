'use strict';

const { verifyAuthToken } = require('../utils/jwt');

/**
 * Verifica que la petición incluya un token JWT válido en el header
 * `Authorization: Bearer <token>`. Si es válido, decodifica el payload
 * y lo expone en `req.auth` para los middlewares/controladores siguientes.
 *
 * Respuestas:
 *   - 401 si falta el header, el esquema no es Bearer, el token está
 *     malformado o la firma/expiración es inválida
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAuthJWT = (req, res, next) => {
    const authHeader = String(req.headers.authorization || '').trim();

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        return res.status(401).send({
            message: 'Token JWT requerido en header Authorization: Bearer <token>'
        });
    }

    const token = authHeader.slice(7).trim();

    try {
        const decoded = verifyAuthToken(token);
        req.auth = decoded;
        return next();
    } catch (error) {
        return res.status(401).send({
            message: 'Token JWT inválido o expirado'
        });
    }
};

module.exports = {
    requireAuthJWT
};
