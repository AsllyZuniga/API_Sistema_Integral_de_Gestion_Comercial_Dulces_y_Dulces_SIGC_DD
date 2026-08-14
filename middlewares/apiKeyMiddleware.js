'use strict';

const { requireAuthJWT } = require('./authJwtMiddleware');
const apiKeyService = require('../services/apiKeyService');

/**
 * Autenticación dual para integraciones externas:
 *   - `X-API-Key: <token>`          → siempre se valida como API key (estricto).
 *   - `Authorization: Bearer <t>`   → se intenta como API key; si el token no
 *     es una API key conocida, se delega en el JWT existente (así el frontend,
 *     que manda Bearer <JWT>, sigue funcionando sin cambios).
 *
 * Política de API keys (vigente):
 *   - Solo permiten GET (lectura). Cualquier otro método HTTP recibe 403.
 *   - En GET se exige el scope `read`.
 *   - La key inválida o inexistente recibe 401.
 *
 * Cuando la petición es autenticada por API key se expone en `req`:
 *   - req.apiKey = { keyId, scopes }   (para logs, nunca el token)
 *   - req.auth  = { rol: '1', apiKeyAuth: true }  (perfil de lectura
 *     equivalente a admin; necesario para los controllers/roles que
 *     leen req.auth sin modificar su lógica).
 *
 * Las respuestas de error usan el mismo shape { message } que
 * authJwtMiddleware para mantener consistencia en toda la API.
 */

function responder401(res, mensaje) {
    return res.status(401).send({ message: mensaje });
}

function responder403(res, mensaje) {
    return res.status(403).send({ message: mensaje });
}

/**
 * Valida que la key tenga permitido el método HTTP y el scope, expone
 * req.apiKey / req.auth y continúa.
 *
 * @param {{ keyId: string, scopes: string[] }} key
 */
function autorizarApiKey(key, req, res, next) {
    // Política: las API keys solo leen (GET). Sin excepción.
    if (!apiKeyService.metodoPermitidoParaApiKey(req.method)) {
        return responder403(res, 'Las API keys solo tienen acceso de lectura');
    }

    const scopeRequerido = apiKeyService.getScopeParaMetodo(req.method);

    if (scopeRequerido && !apiKeyService.keyTieneScope(key, scopeRequerido)) {
        return responder403(res, `Se requiere el permiso "${scopeRequerido}" para esta operación`);
    }

    // Nunca exponer el token; solo metadata.
    req.apiKey = { keyId: key.keyId, scopes: key.scopes };
    req.auth = { rol: '1', apiKeyAuth: true };

    return next();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const apiKeyOrJwt = (req, res, next) => {
    const xApiKey = String(req.headers['x-api-key'] || '').trim();
    const authHeader = String(req.headers.authorization || '').trim();
    const esBearer = authHeader.toLowerCase().startsWith('bearer ');
    const bearerToken = esBearer ? authHeader.slice(7).trim() : '';

    // Sin cabeceras de API key: flujo JWT existente, sin cambios.
    if (!xApiKey && !bearerToken) {
        return requireAuthJWT(req, res, next);
    }

    // X-API-Key: estricto. Si el token no es una API key conocida -> 401.
    if (xApiKey) {
        const key = apiKeyService.buscarKeyPorToken(xApiKey);
        if (!key) {
            return responder401(res, 'API key inválida');
        }
        return autorizarApiKey(key, req, res, next);
    }

    // Bearer: se intenta como API key; si no coincide, cae al JWT
    // (compatibilidad con el frontend, que envía Bearer <JWT>).
    const key = apiKeyService.buscarKeyPorToken(bearerToken);
    if (key) {
        return autorizarApiKey(key, req, res, next);
    }
    return requireAuthJWT(req, res, next);
};

/**
 * Variante estricta: exige API key (sin fallback a JWT).
 * Útil si más adelante se quieren rutas exclusivas de integración.
 */
const requireApiKey = (req, res, next) => {
    const xApiKey = String(req.headers['x-api-key'] || '').trim();
    const authHeader = String(req.headers.authorization || '').trim();
    const esBearer = authHeader.toLowerCase().startsWith('bearer ');
    const bearerToken = esBearer ? authHeader.slice(7).trim() : '';

    const token = xApiKey || bearerToken;

    if (!token) {
        return responder401(res, 'API key requerida');
    }

    const key = apiKeyService.buscarKeyPorToken(token);

    if (!key) {
        return responder401(res, 'API key inválida');
    }

    return autorizarApiKey(key, req, res, next);
};

module.exports = { apiKeyOrJwt, requireApiKey };
