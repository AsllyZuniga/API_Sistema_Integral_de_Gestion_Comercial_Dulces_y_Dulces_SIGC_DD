'use strict';

const { verifyAuthToken } = require('../utils/jwt');

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
