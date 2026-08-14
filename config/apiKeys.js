'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Carga centralizada de API keys (tokens estáticos).
 *
 * Prioridad de fuentes (sin tocar la base de datos):
 *   1. Variables de entorno (producción y overrides).
 *   2. Archivo de configuración local (solo desarrollo).
 *
 * Aislamiento por entorno (NODE_ENV):
 *   - production: SOLO API_KEYS_JSON o API_KEYS_FILE. Ignora config/apiKeys.json
 *     para que un token dev nunca sea válido en producción.
 *   - development/test: config/apiKeys.json (gitignored) + override por
 *     API_KEYS_JSON si se define.
 *
 * Formato de cada key:
 *   { keyId: string, token: string, scopes: string[] }
 *
 * Seguridad: nunca se registran tokens completos; solo keyIds.
 */

const SCOPES_VALIDOS = new Set(['read', 'write', 'update', 'delete']);
const DEV_KEYS_FILE = path.join(__dirname, 'apiKeys.json');
const DEV_KEYS_EXAMPLE = path.join(__dirname, 'apiKeys.example.json');

function esAmbienteProduccion() {
    return String(process.env.NODE_ENV || 'development').trim().toLowerCase() === 'production';
}

function parsearKeysJson(raw, origen) {
    if (!raw || typeof raw !== 'string') {
        return [];
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (error) {
        // Solo keyIds; nunca se expone el contenido.
        console.warn(`[apiKeys] JSON inválido en ${origen}; keys ignoradas`);
        return [];
    }

    const lista = Array.isArray(data) ? data : data.keys;
    if (!Array.isArray(lista)) {
        console.warn(`[apiKeys] Estructura inválida en ${origen}; se espera array o { keys: [] }`);
        return [];
    }

    return lista.map(normalizarKey).filter(Boolean);
}

function normalizarKey(entry) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const token = String(entry.token || '').trim();
    if (!token) {
        console.warn('[apiKeys] Key sin token; entrada ignorada');
        return null;
    }

    const keyId = String(entry.keyId || '').trim() || `key-${crypto.createHash('sha256').update(token).digest('hex').slice(0, 8)}`;

    const scopes = Array.isArray(entry.scopes)
        ? entry.scopes.map((s) => String(s).toLowerCase()).filter((s) => SCOPES_VALIDOS.has(s))
        : [];

    return { keyId, token, scopes };
}

function cargarKeysArchivoLocal() {
    const archivo = fs.existsSync(DEV_KEYS_FILE) ? DEV_KEYS_FILE : DEV_KEYS_EXAMPLE;

    if (!fs.existsSync(archivo)) {
        return [];
    }

    if (archivo === DEV_KEYS_EXAMPLE) {
        console.warn('[apiKeys] No existe config/apiKeys.json; usando apiKeys.example.json. Genera keys reales para desarrollo.');
    }

    let raw;
    try {
        raw = fs.readFileSync(archivo, 'utf8');
    } catch (error) {
        console.warn(`[apiKeys] No se pudo leer ${archivo}; sin keys de archivo`);
        return [];
    }

    return parsearKeysJson(raw, archivo);
}

function cargarKeysDeArchivoExterno(ruta) {
    if (!ruta) {
        return [];
    }

    if (!fs.existsSync(ruta)) {
        console.warn(`[apiKeys] API_KEYS_FILE no existe: ${ruta}`);
        return [];
    }

    let raw;
    try {
        raw = fs.readFileSync(ruta, 'utf8');
    } catch (error) {
        console.warn(`[apiKeys] No se pudo leer API_KEYS_FILE: ${ruta}`);
        return [];
    }

    return parsearKeysJson(raw, ruta);
}

/**
 * @returns {{ keyId: string, token: string, scopes: string[] }[]}
 */
function getApiKeys() {
    const produccion = esAmbienteProduccion();
    const keys = [];

    if (produccion) {
        keys.push(...cargarKeysDeArchivoExterno(process.env.API_KEYS_FILE));
        keys.push(...parsearKeysJson(process.env.API_KEYS_JSON, 'env API_KEYS_JSON'));
    } else {
        keys.push(...cargarKeysArchivoLocal());
        // Override opcional por entorno también en desarrollo.
        keys.push(...parsearKeysJson(process.env.API_KEYS_JSON, 'env API_KEYS_JSON'));
    }

    if (!produccion && keys.length === 0) {
        console.warn('[apiKeys] Sin API keys configuradas para desarrollo');
    }

    // Registro sanitizado: nunca tokens.
    console.log(`[apiKeys] Cargadas ${keys.length} API keys (entorno: ${produccion ? 'production' : 'development'}): ${keys.map((k) => k.keyId).join(', ')}`);

    return keys;
}

module.exports = { getApiKeys };
