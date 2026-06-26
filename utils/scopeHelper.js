'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

/**
 * Helpers compartidos para que los endpoints sean "role-aware" desde el JWT.
 *
 * Roles:
 *   - 1 = Admin        → tipo 'all'  (sin filtro)
 *   - 2 = Supervisor   → tipo 'team' (vendedor.id_supervisor = auth.idUsuario)
 *   - 3 = Vendedor     → tipo 'self' (vendedor.id_usuario = auth.idUsuario)
 *
 * Si no llega `auth` (compatibilidad hacia atrás), se trata como Admin.
 *
 * Uso típico:
 *   const scope = await getVendedorScopeFromAuth(req.auth);
 *   const whereCuota = buildScopeWhereCuotaProveedor(scope, replacements);
 *   const whereVenta = buildScopeWhereVenta(scope, replacements);
 *   ... y se interpolan en la query SQL.
 */

/**
 * Determina el alcance (scope) a partir del JWT.
 *
 * @param {{idUsuario?: number, idVendedor?: number, rol?: number|string} | null | undefined} auth
 * @returns {Promise<
 *   {tipo: 'all'} |
 *   {tipo: 'team', idsVendedor: number[]} |
 *   {tipo: 'self', idVendedor: number | null}
 * >}
 */
const getVendedorScopeFromAuth = async (auth) => {
    if (!auth) return { tipo: 'all' };

    const rol = Number(auth.rol);
    if (rol === 1) return { tipo: 'all' };

    if (rol === 2) {
        const equipo = await sequelize.query(`
            SELECT id_vendedor
            FROM vendedor
            WHERE id_supervisor = :idUsuario
              AND id_vendedor IS NOT NULL
        `, {
            replacements: { idUsuario: auth.idUsuario },
            type: QueryTypes.SELECT
        });
        return { tipo: 'team', idsVendedor: equipo.map((v) => v.id_vendedor) };
    }

    // rol 3 (Vendedor) u otro: solo sus propios datos
    const ownVendedor = await sequelize.query(`
        SELECT id_vendedor FROM vendedor WHERE id_usuario = :idUsuario LIMIT 1
    `, {
        replacements: { idUsuario: auth.idUsuario },
        type: QueryTypes.SELECT,
        plain: true
    });
    return { tipo: 'self', idVendedor: ownVendedor?.id_vendedor ?? null };
};

/**
 * Construye el fragmento SQL `AND ...` para filtrar `vendedorCuotaProveedor`
 * (o cualquier tabla con `id_vendedor`) según el scope.
 *
 *   - 'all'  → ''
 *   - 'team' → 'AND <column> IN (:scopeV0, :scopeV1, ...)'  (o forzado a -1 si vacío)
 *   - 'self' → 'AND <column> = :scopeV0'                    (o forzado a -1 si null)
 *
 * Los bindings se agregan a `replacements` bajo las claves `scopeV0..scopeVN`.
 *
 * @param {object} scope
 * @param {string} [column='vcp.id_vendedor'] columna a filtrar
 * @param {object} [replacements={}] objeto al que se agregan los bindings
 * @returns {string} fragmento SQL (puede empezar con ' AND ...' o ser vacío)
 */
const buildScopeWhere = (scope, column = 'vcp.id_vendedor', replacements = {}) => {
    if (!scope || scope.tipo === 'all') return '';
    if (scope.tipo === 'team') {
        if (!scope.idsVendedor || scope.idsVendedor.length === 0) {
            return ` AND ${column} = -1`;
        }
        const placeholders = scope.idsVendedor
            .map((_, i) => `:scopeV${i}`)
            .join(',');
        scope.idsVendedor.forEach((id, i) => { replacements[`scopeV${i}`] = id; });
        return ` AND ${column} IN (${placeholders})`;
    }
    if (scope.tipo === 'self') {
        if (!scope.idVendedor) return ` AND ${column} = -1`;
        replacements.scopeV0 = scope.idVendedor;
        return ` AND ${column} = :scopeV0`;
    }
    return '';
};

/**
 * Variante para filtrar tablas de ventas (alias `v`).
 * Usa claves `scopeVV*` para no chocar con las del `buildScopeWhere`.
 */
const buildScopeWhereVenta = (scope, column = 'v.id_vendedor', replacements = {}) => {
    if (!scope || scope.tipo === 'all') return '';
    if (scope.tipo === 'team') {
        if (!scope.idsVendedor || scope.idsVendedor.length === 0) {
            return ` AND ${column} = -1`;
        }
        const placeholders = scope.idsVendedor
            .map((_, i) => `:scopeVV${i}`)
            .join(',');
        scope.idsVendedor.forEach((id, i) => { replacements[`scopeVV${i}`] = id; });
        return ` AND ${column} IN (${placeholders})`;
    }
    if (scope.tipo === 'self') {
        if (!scope.idVendedor) return ` AND ${column} = -1`;
        replacements.scopeVV0 = scope.idVendedor;
        return ` AND ${column} = :scopeVV0`;
    }
    return '';
};

module.exports = {
    getVendedorScopeFromAuth,
    buildScopeWhere,
    buildScopeWhereVenta
};
