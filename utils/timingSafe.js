'use strict';

const crypto = require('crypto');

/**
 * Comparación de strings a prueba de timing attacks.
 *
 * Se comparan hashes SHA-256 (longitud fija de 32 bytes) en lugar de los
 * strings originales para que la longitud del token real nunca se pueda
 * deducir a partir del tiempo de respuesta. La comparación usa
 * `crypto.timingSafeEqual` para evitar medir diferencias byte a byte.
 *
 * @param {string} valorSecreto  Token/hash almacenado.
 * @param {string} valorEntrada  Token/hash provisto por el cliente.
 * @returns {boolean}
 */
function compararSeguro(valorSecreto, valorEntrada) {
    const secreto = String(valorSecreto || '');
    const entrada = String(valorEntrada || '');

    const hashSecreto = crypto.createHash('sha256').update(secreto).digest();
    const hashEntrada = crypto.createHash('sha256').update(entrada).digest();

    return crypto.timingSafeEqual(hashSecreto, hashEntrada);
}

module.exports = { compararSeguro };
