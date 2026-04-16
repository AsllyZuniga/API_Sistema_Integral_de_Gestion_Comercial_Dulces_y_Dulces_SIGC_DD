'use strict';

const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
const FALLBACK_SECRET = 'sigc-dd-dev-secret-change-me';

const getJwtSecret = () => process.env.JWT_SECRET || FALLBACK_SECRET;

const signAuthToken = (payload, options = {}) => {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: options.expiresIn || DEFAULT_EXPIRES_IN
    });
};

const verifyAuthToken = (token) => {
    return jwt.verify(token, getJwtSecret());
};

module.exports = {
    signAuthToken,
    verifyAuthToken,
    DEFAULT_EXPIRES_IN
};
