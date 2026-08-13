'use strict';

const { compararSeguro } = require('../utils/timingSafe');
const { getApiKeys } = require('../config/apiKeys');

/**
 * Servicio de API keys (tokens estáticos de integración).
 *
 * Responsabilidades:
 *   - Cargar el conjunto de keys válidas (config + entorno).
 *   - Resolver un token entrante contra las keys registradas con
 *     comparación a prueba de timing attacks.
 *   - Mapear métodos HTTP a scopes y evaluar si una key los posee.
 *
 * No contiene lógica de Express: eso vive en el middleware. No toca la
 * base de datos: los tokens se configuran por archivo/entorno.
 */

// Política actual: las API keys solo permiten lectura (GET).
const METODO_PERMITIDO_API_KEY = 'GET';

// Mapeo método HTTP -> scope (diseño extensible para el futuro).
const SCOPE_POR_METODO = {
    GET: 'read',
    POST: 'write',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete'
};

const _cacheKeys = (() => {
    let keys = null;
    return {
        get() {
            if (!keys) {
                keys = getApiKeys();
            }
            return keys;
        },
        refresh() {
            keys = getApiKeys();
            return keys;
        }
    };
})();

/**
 * Extrae el token de API key de las cabeceras soportadas.
 * Precedencia: `Authorization: Bearer <token>` sobre `X-API-Key: <token>`.
 * Retorna null si ninguna cabecera trae un token de API key.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extraerTokenDeRequest(req) {
    const authHeader = String(req.headers.authorization || '').trim();

    if (authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
            return token;
        }
    }

    const apiKeyHeader = String(req.headers['x-api-key'] || '').trim();
    return apiKeyHeader || null;
}

/**
 * Busca la key registrada cuyo token coincida (comparación segura).
 *
 * @param {string} token
 * @returns {{ keyId: string, token: string, scopes: string[] } | null}
 */
function buscarKeyPorToken(token) {
    if (!token) {
        return null;
    }

    const keys = _cacheKeys.get();

    for (const key of keys) {
        if (compararSeguro(key.token, token)) {
            return key;
        }
    }

    return null;
}

/**
 * @returns {string} scope requerido para un método HTTP, o null si no aplica.
 */
function getScopeParaMetodo(metodo) {
    return SCOPE_POR_METODO[String(metodo || '').toUpperCase()] || null;
}

/**
 * ¿La key posee el scope dado?
 * @param {{scopes: string[]}} key
 * @param {string} scope
 * @returns {boolean}
 */
function keyTieneScope(key, scope) {
    if (!key || !Array.isArray(key.scopes)) {
        return false;
    }
    return key.scopes.includes(scope);
}

/**
 * ¿El método HTTP está permitido para peticiones autenticadas con API key?
 * Política vigente: solo GET.
 *
 * @param {string} metodo
 * @returns {boolean}
 */
function metodoPermitidoParaApiKey(metodo) {
    return String(metodo || '').toUpperCase() === METODO_PERMITIDO_API_KEY;
}

/**
 * Recarga las keys desde config/entorno (útil en pruebas o rotación).
 */
function refrescarKeys() {
    return _cacheKeys.refresh();
}

module.exports = {
    extraerTokenDeRequest,
    buscarKeyPorToken,
    getScopeParaMetodo,
    keyTieneScope,
    metodoPermitidoParaApiKey,
    refrescarKeys
};
