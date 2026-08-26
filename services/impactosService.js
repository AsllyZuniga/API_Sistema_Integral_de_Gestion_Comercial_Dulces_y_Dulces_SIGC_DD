'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const TIPOS = {
    vendedores: { cuotaTable: 'impactos_cliente', displayKey: 'vendedor' },
    proveedores: { cuotaTable: 'impactos_proveedor', displayKey: 'proveedor' },
    categorias: { cuotaTable: 'impactos_categoria', displayKey: 'categoria' }
};

function toArr(val) {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
    return [...new Set(flat)];
}

function padCode(value) {
    const s = String(value ?? '').trim();
    if (/^\d+$/.test(s)) return s.padStart(4, '0');
    return s;
}

function extractCategoryName(dbNombre) {
    const raw = String(dbNombre ?? '').trim();
    const match = raw.match(/(?:\d+\s*-\s*)?(?:\d+\s*-)?\s*(.+)$/);
    if (match && match[1]) return match[1].trim();
    return raw;
}

function buildScopeCond(scope, column, replacements, prefix) {
    if (!scope || scope.tipo === 'all') return '';
    if (scope.tipo === 'team') {
        if (!scope.idsVendedor || scope.idsVendedor.length === 0) return `${column} = -1`;
        const placeholders = scope.idsVendedor.map((_, i) => `:${prefix}${i}`).join(',');
        scope.idsVendedor.forEach((id, i) => { replacements[`${prefix}${i}`] = id; });
        return `${column} IN (${placeholders})`;
    }
    if (scope.tipo === 'self') {
        if (!scope.idVendedor) return `${column} = -1`;
        replacements[`${prefix}0`] = scope.idVendedor;
        return `${column} = :${prefix}0`;
    }
    return '';
}

async function resolverVendedoresPorCanalCiudad(filtros) {
    const canales = toArr(filtros.canal);
    const ciudades = toArr(filtros.ciudad);

    if (!canales.length && !ciudades.length) return null;

    const replacements = {};
    const conds = [];

    if (canales.length) {
        conds.push('CAST(ca.id_canal AS TEXT) IN (:canales)');
        replacements.canales = canales;
    }
    if (ciudades.length) {
        conds.push('CAST(dv.id_ciudad_original AS TEXT) IN (:ciudades)');
        replacements.ciudades = ciudades;
    }

    const sql = `
        SELECT DISTINCT v.id_vendedor
        FROM venta v
        LEFT JOIN canal ca ON ca.id_canal = v.id_canal
        LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        WHERE ${conds.join(' AND ')}
    `;

    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return rows.map(r => r.id_vendedor);
}

async function resolverVendedoresPorCodigo(codigos) {
    const list = toArr(codigos);
    if (!list.length) return [];

    const ids = [];
    for (const c of list) {
        const raw = String(c ?? '').trim();
        if (!raw) continue;

        // Fuente de verdad: el código padded (4 dígitos) siempre gana.
        const padded = /^\d+$/.test(raw) ? String(Number(raw)).padStart(4, '0') : raw;
        const [paddedRow] = await sequelize.query(
            'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor = :padded',
            { replacements: { padded }, type: QueryTypes.SELECT }
        );
        if (paddedRow) {
            ids.push(paddedRow.id_vendedor);
            continue;
        }

        // Si no hay padded, buscar el raw exacto.
        const [rawRow] = await sequelize.query(
            'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor = :raw',
            { replacements: { raw }, type: QueryTypes.SELECT }
        );
        if (rawRow) {
            ids.push(rawRow.id_vendedor);
            continue;
        }

        // Último recurso: búsqueda por variantes numéricas.
        if (/^\d+$/.test(raw)) {
            const variants = [String(Number(raw))];
            const rows = await sequelize.query(
                'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor IN (:variants)',
                { replacements: { variants }, type: QueryTypes.SELECT }
            );
            if (rows.length) ids.push(rows[0].id_vendedor);
        }
    }

    return [...new Set(ids)];
}

function buildCondCanalCiudad(idsCanalCiudad, column, replacements, key) {
    if (!Array.isArray(idsCanalCiudad)) return '';
    if (idsCanalCiudad.length) {
        replacements[key] = idsCanalCiudad;
        return `${column} IN (:${key})`;
    }
    return `${column} = -1`;
}

function formatRow(cuota, impactos) {
    const c = Number(cuota) || 0;
    const i = Number(impactos) || 0;
    return {
        cuotaImpactos: c,
        impactos: i,
        porcCump: c > 0 ? Math.round((i / c) * 1000) / 10 : 0,
        faltan: Math.max(c - i, 0)
    };
}

function inferirTipoPeriodo(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return ['MENSUAL'];
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    if (dias <= 1) return ['DIARIO'];
    if (dias <= 8) return ['SEMANAL'];
    return ['MENSUAL'];
}

function normalizeReporteProvName(dvAlias = 'dv', prAlias = 'pr') {
    return `UPPER(TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
            TRIM(REGEXP_REPLACE(
                COALESCE(TRIM(${dvAlias}.reporte_prov_con_obs), COALESCE(TRIM(${prAlias}.nombre), 'SIN LINEA')),
                '^[0-9]+ - ', ''
            )),
            '[^a-zA-Z0-9 ]', ' ', 'g'
        ),
        ' +', ' ', 'g'
    )))`;
}

function buildPeriodosDesdeVentasSql(tipoPeriodo, tabla = 'venta', alias = 'v', condicionesAdicionales = '') {
    const partes = [];
    const whereBase = `${alias}.fecha >= :fechaInicio AND ${alias}.fecha <= :fechaFin${condicionesAdicionales ? ' AND ' + condicionesAdicionales : ''}`;

    if (tipoPeriodo.includes('MENSUAL')) {
        partes.push(`
            SELECT DISTINCT ${alias}.id_vendedor, 'MENSUAL' AS tipo_periodo,
                DATE_TRUNC('month', ${alias}.fecha)::date AS fecha_inicio,
                (DATE_TRUNC('month', ${alias}.fecha) + INTERVAL '1 month - 1 day')::date AS fecha_fin
            FROM ${tabla} ${alias}
            WHERE ${whereBase}
        `);
    }
    if (tipoPeriodo.includes('SEMANAL')) {
        partes.push(`
            SELECT DISTINCT ${alias}.id_vendedor, 'SEMANAL' AS tipo_periodo,
                DATE_TRUNC('week', ${alias}.fecha)::date AS fecha_inicio,
                (DATE_TRUNC('week', ${alias}.fecha) + INTERVAL '6 days')::date AS fecha_fin
            FROM ${tabla} ${alias}
            WHERE ${whereBase}
        `);
    }
    if (tipoPeriodo.includes('DIARIO')) {
        partes.push(`
            SELECT DISTINCT ${alias}.id_vendedor, 'DIARIO' AS tipo_periodo,
                ${alias}.fecha AS fecha_inicio,
                ${alias}.fecha AS fecha_fin
            FROM ${tabla} ${alias}
            WHERE ${whereBase}
        `);
    }

    return partes.join(' UNION ');
}

function buildPeriodosDimensionDesdeVentasSql(tipoPeriodo, dimCol, alias = 'v', condicionesAdicionales = '') {
    const partes = [];
    const whereBase = `${alias}.fecha >= :fechaInicio AND ${alias}.fecha <= :fechaFin${condicionesAdicionales ? ' AND ' + condicionesAdicionales : ''}`;

    const esProveedor = dimCol === 'id_proveedor';

    if (tipoPeriodo.includes('MENSUAL')) {
        if (esProveedor) {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.id_proveedor AS id_dim, 'MENSUAL' AS tipo_periodo,
                    DATE_TRUNC('month', ${alias}.fecha)::date AS fecha_inicio,
                    (DATE_TRUNC('month', ${alias}.fecha) + INTERVAL '1 month - 1 day')::date AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase} AND i.id_proveedor IS NOT NULL
            `);
        } else {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.${dimCol} AS id_dim, 'MENSUAL' AS tipo_periodo,
                    DATE_TRUNC('month', ${alias}.fecha)::date AS fecha_inicio,
                    (DATE_TRUNC('month', ${alias}.fecha) + INTERVAL '1 month - 1 day')::date AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase}
            `);
        }
    }
    if (tipoPeriodo.includes('SEMANAL')) {
        if (esProveedor) {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.id_proveedor AS id_dim, 'SEMANAL' AS tipo_periodo,
                    DATE_TRUNC('week', ${alias}.fecha)::date AS fecha_inicio,
                    (DATE_TRUNC('week', ${alias}.fecha) + INTERVAL '6 days')::date AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase} AND i.id_proveedor IS NOT NULL
            `);
        } else {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.${dimCol} AS id_dim, 'SEMANAL' AS tipo_periodo,
                    DATE_TRUNC('week', ${alias}.fecha)::date AS fecha_inicio,
                    (DATE_TRUNC('week', ${alias}.fecha) + INTERVAL '6 days')::date AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase}
            `);
        }
    }
    if (tipoPeriodo.includes('DIARIO')) {
        if (esProveedor) {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.id_proveedor AS id_dim, 'DIARIO' AS tipo_periodo,
                    ${alias}.fecha AS fecha_inicio, ${alias}.fecha AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase} AND i.id_proveedor IS NOT NULL
            `);
        } else {
            partes.push(`
                SELECT DISTINCT ${alias}.id_vendedor, i.${dimCol} AS id_dim, 'DIARIO' AS tipo_periodo,
                    ${alias}.fecha AS fecha_inicio, ${alias}.fecha AS fecha_fin
                FROM venta ${alias}
                JOIN detalle_venta dv ON dv.id_venta = ${alias}.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE ${whereBase}
            `);
        }
    }

    return partes.join(' UNION ');
}

function buildVentaValidaConds(prefix = 'v') {
    return [
        `${prefix}.valor_neto > 0`,
        `UPPER(TRIM(${prefix}.numero_documento)) NOT LIKE 'NC%'`
    ];
}

async function obtenerPeriodosCuota({ cuotaTable, fechaInicio, fechaFin, tipoPeriodo, scope, idsCanalCiudad, filtros }) {
    const replacements = { fechaInicio, fechaFin, tipoPeriodo };
    const cuotaConds = [
        'cu.fecha_fin >= :fechaInicio',
        'cu.fecha_inicio <= :fechaFin',
        'cu.tipo_periodo IN (:tipoPeriodo)'
    ];
    const ventaConds = [];

    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) cuotaConds.push(scopeCuota);
    const scopeVenta = buildScopeCond(scope, 'v.id_vendedor', replacements, 'vq');
    if (scopeVenta) ventaConds.push(scopeVenta);

    const condCcCuota = buildCondCanalCiudad(idsCanalCiudad, 'cu.id_vendedor', replacements, 'ccCuota');
    if (condCcCuota) cuotaConds.push(condCcCuota);
    const condCcVenta = buildCondCanalCiudad(idsCanalCiudad, 'v.id_vendedor', replacements, 'ccVenta');
    if (condCcVenta) ventaConds.push(condCcVenta);

    if (filtros && filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            cuotaConds.push('cu.id_vendedor IN (:vendFiltro)');
            ventaConds.push('v.id_vendedor IN (:vendFiltro)');
        } else {
            cuotaConds.push('cu.id_vendedor = -1');
            ventaConds.push('v.id_vendedor = -1');
        }
    }

    const ventasPeriodosSql = buildPeriodosDesdeVentasSql(tipoPeriodo, 'venta', 'v', ventaConds.join(' AND '));

    const sql = `
        WITH cuota_periodos AS (
            SELECT
                cu.id_vendedor,
                cu.tipo_periodo,
                cu.fecha_inicio,
                cu.fecha_fin,
                SUM(cu.cuota)::numeric AS cuota_total
            FROM ${cuotaTable} cu
            WHERE ${cuotaConds.join(' AND ')}
            GROUP BY cu.id_vendedor, cu.tipo_periodo, cu.fecha_inicio, cu.fecha_fin
        ),
        venta_periodos AS (
            ${ventasPeriodosSql}
        ),
        venta_periodos_sin_cuota AS (
            SELECT vp.*
            FROM venta_periodos vp
            WHERE NOT EXISTS (
                SELECT 1 FROM cuota_periodos cp
                WHERE cp.id_vendedor = vp.id_vendedor
                  AND cp.tipo_periodo = vp.tipo_periodo
                  AND cp.fecha_inicio <= vp.fecha_fin
                  AND cp.fecha_fin >= vp.fecha_inicio
            )
        )
        SELECT id_vendedor, tipo_periodo, fecha_inicio, fecha_fin, cuota_total
        FROM cuota_periodos
        UNION ALL
        SELECT id_vendedor, tipo_periodo, fecha_inicio, fecha_fin, 0 AS cuota_total
        FROM venta_periodos_sin_cuota
        ORDER BY id_vendedor, tipo_periodo, fecha_inicio
    `;

    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}



async function obtenerPeriodosDimensionCuota({ cuotaTable, dimCol, fechaInicio, fechaFin, tipoPeriodo, scope, idsCanalCiudad, filtros }) {
    const replacements = { fechaInicio, fechaFin, tipoPeriodo };
    const cuotaConds = [
        'cu.fecha_fin >= :fechaInicio',
        'cu.fecha_inicio <= :fechaFin',
        'cu.tipo_periodo IN (:tipoPeriodo)'
    ];
    const ventaConds = [];

    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) cuotaConds.push(scopeCuota);
    const scopeVenta = buildScopeCond(scope, 'v.id_vendedor', replacements, 'vq');
    if (scopeVenta) ventaConds.push(scopeVenta);

    const condCcCuota = buildCondCanalCiudad(idsCanalCiudad, 'cu.id_vendedor', replacements, 'ccCuota');
    if (condCcCuota) cuotaConds.push(condCcCuota);
    const condCcVenta = buildCondCanalCiudad(idsCanalCiudad, 'v.id_vendedor', replacements, 'ccVenta');
    if (condCcVenta) ventaConds.push(condCcVenta);

    if (filtros && filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            cuotaConds.push('cu.id_vendedor IN (:vendFiltro)');
            ventaConds.push('v.id_vendedor IN (:vendFiltro)');
        } else {
            cuotaConds.push('cu.id_vendedor = -1');
            ventaConds.push('v.id_vendedor = -1');
        }
    }

    const dimFilters = filtros ? (dimCol === 'id_proveedor' ? toArr(filtros.proveedor) : toArr(filtros.categoria)) : [];
    if (dimFilters.length) {
        replacements.dimFiltro = dimFilters;
        cuotaConds.push(`cu.${dimCol} IN (:dimFiltro)`);
        ventaConds.push(`i.${dimCol} IN (:dimFiltro)`);
    }

    const ventasPeriodosSql = buildPeriodosDimensionDesdeVentasSql(tipoPeriodo, dimCol, 'v', ventaConds.join(' AND '));

    const sql = `
        WITH cuota_periodos AS (
            SELECT
                cu.id_vendedor,
                cu.${dimCol} AS id_dim,
                cu.tipo_periodo,
                cu.fecha_inicio,
                cu.fecha_fin,
                SUM(cu.cuota)::numeric AS cuota_total
            FROM ${cuotaTable} cu
            WHERE ${cuotaConds.join(' AND ')}
            GROUP BY cu.id_vendedor, cu.${dimCol}, cu.tipo_periodo, cu.fecha_inicio, cu.fecha_fin
        ),
        venta_periodos AS (
            ${ventasPeriodosSql}
        ),
        venta_periodos_sin_cuota AS (
            SELECT vp.*
            FROM venta_periodos vp
            WHERE NOT EXISTS (
                SELECT 1 FROM cuota_periodos cp
                WHERE cp.id_vendedor = vp.id_vendedor
                  AND cp.id_dim = vp.id_dim
                  AND cp.tipo_periodo = vp.tipo_periodo
                  AND cp.fecha_inicio <= vp.fecha_fin
                  AND cp.fecha_fin >= vp.fecha_inicio
            )
        )
        SELECT id_vendedor, id_dim, tipo_periodo, fecha_inicio, fecha_fin, cuota_total
        FROM cuota_periodos
        UNION ALL
        SELECT id_vendedor, id_dim, tipo_periodo, fecha_inicio, fecha_fin, 0 AS cuota_total
        FROM venta_periodos_sin_cuota
        ORDER BY id_vendedor, id_dim, tipo_periodo, fecha_inicio
    `;

    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

function escapeSqlString(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return "'" + String(value).replace(/'/g, "''") + "'";
}

function buildPeriodosValues(periodos, columns, types) {
    return periodos.map(p => {
        const vals = columns.map((col, idx) => {
            const type = types ? types[idx] : null;
            const val = escapeSqlString(p[col]);
            if (type) {
                return `${val}::${type}`;
            }
            if (col === 'fecha_inicio' || col === 'fecha_fin') {
                return `DATE ${val}`;
            }
            return val;
        });
        return `(${vals.join(', ')})`;
    }).join(',\n            ');
}

async function calcularImpactosVendedorBatch(periodos, fechaInicioGlobal, fechaFinGlobal) {
    if (!periodos || periodos.length === 0) return new Map();

    const values = buildPeriodosValues(periodos, ['id_vendedor', 'tipo_periodo', 'fecha_inicio', 'fecha_fin'], ['int', null, null, null]);

    const sql = `
        WITH periodos_raw(id_vendedor, tipo_periodo, fecha_inicio, fecha_fin) AS (
            VALUES ${values}
        ),
        periodos AS (
            SELECT
                id_vendedor,
                tipo_periodo,
                fecha_inicio,
                fecha_fin,
                GREATEST(fecha_inicio, COALESCE(:fechaInicio, fecha_inicio)) AS calc_fecha_inicio,
                LEAST(fecha_fin, COALESCE(:fechaFin, fecha_fin)) AS calc_fecha_fin
            FROM periodos_raw
        ),
        cliente_subtotal AS (
            SELECT
                p.id_vendedor,
                p.tipo_periodo,
                p.fecha_inicio,
                p.fecha_fin,
                v.id_cliente,
                SUM(
                    CASE
                        WHEN dv.subtotal = 0 THEN 0
                        ELSE dv.subtotal
                    END
                ) AS subtotal_neto
            FROM periodos p
            JOIN venta v ON v.id_vendedor = p.id_vendedor
              AND v.fecha >= p.calc_fecha_inicio
              AND v.fecha <= p.calc_fecha_fin
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            GROUP BY p.id_vendedor, p.tipo_periodo, p.fecha_inicio, p.fecha_fin, v.id_cliente
        )
        SELECT
            id_vendedor,
            tipo_periodo,
            fecha_inicio,
            fecha_fin,
            COUNT(*) FILTER (WHERE subtotal_neto > 0) AS impactos
        FROM cliente_subtotal
        GROUP BY id_vendedor, tipo_periodo, fecha_inicio, fecha_fin
    `;

    const rows = await sequelize.query(sql, {
        replacements: { fechaInicio: fechaInicioGlobal, fechaFin: fechaFinGlobal },
        type: QueryTypes.SELECT
    });
    const map = new Map();
    rows.forEach(r => {
        const key = `${r.id_vendedor}|${r.tipo_periodo}|${r.fecha_inicio}|${r.fecha_fin}`;
        map.set(key, Number(r.impactos) || 0);
    });
    return map;
}

async function calcularImpactosDimensionBatch(periodos, dim, fechaInicioGlobal, fechaFinGlobal) {
    if (!periodos || periodos.length === 0) return new Map();

    const dimCol = dim === 'proveedor' ? 'id_proveedor' : 'id_categoria';
    const esProveedor = dim === 'proveedor';
    const groupExpr = dim === 'categoria'
        ? "CONCAT(i.id_proveedor::text, '-', v.id_cliente::text)"
        : 'v.id_cliente';

    const values = buildPeriodosValues(periodos, ['id_vendedor', 'id_dim', 'tipo_periodo', 'fecha_inicio', 'fecha_fin'], ['int', 'int', null, null, null]);

    let grupoSubtotalJoin;
    if (esProveedor) {
        grupoSubtotalJoin = `
            FROM periodos p
            JOIN venta v ON v.id_vendedor = p.id_vendedor
              AND v.fecha >= p.calc_fecha_inicio
              AND v.fecha <= p.calc_fecha_fin
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item i ON i.id_item = dv.id_item AND i.id_proveedor = p.id_dim
            GROUP BY p.id_vendedor, p.id_dim, p.tipo_periodo, p.fecha_inicio, p.fecha_fin, ${groupExpr}
        `;
    } else {
        grupoSubtotalJoin = `
            FROM periodos p
            JOIN venta v ON v.id_vendedor = p.id_vendedor
              AND v.fecha >= p.calc_fecha_inicio
              AND v.fecha <= p.calc_fecha_fin
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item i ON i.id_item = dv.id_item AND i.${dimCol} = p.id_dim
            GROUP BY p.id_vendedor, p.id_dim, p.tipo_periodo, p.fecha_inicio, p.fecha_fin, ${groupExpr}
        `;
    }

    const sql = `
        WITH periodos_raw(id_vendedor, id_dim, tipo_periodo, fecha_inicio, fecha_fin) AS (
            VALUES ${values}
        ),
        periodos AS (
            SELECT
                id_vendedor,
                id_dim,
                tipo_periodo,
                fecha_inicio,
                fecha_fin,
                GREATEST(fecha_inicio, COALESCE(:fechaInicio, fecha_inicio)) AS calc_fecha_inicio,
                LEAST(fecha_fin, COALESCE(:fechaFin, fecha_fin)) AS calc_fecha_fin
            FROM periodos_raw
        ),
        grupo_subtotal AS (
            SELECT
                p.id_vendedor,
                p.id_dim,
                p.tipo_periodo,
                p.fecha_inicio,
                p.fecha_fin,
                ${groupExpr} AS grupo,
                SUM(
                    CASE
                        WHEN dv.subtotal = 0 THEN 0
                        ELSE dv.subtotal
                    END
                ) AS subtotal_neto
            ${grupoSubtotalJoin}
        )
        SELECT
            id_vendedor,
            id_dim,
            tipo_periodo,
            fecha_inicio,
            fecha_fin,
            COUNT(*) FILTER (WHERE subtotal_neto > 0) AS impactos
        FROM grupo_subtotal
        GROUP BY id_vendedor, id_dim, tipo_periodo, fecha_inicio, fecha_fin
    `;

    const rows = await sequelize.query(sql, {
        replacements: { fechaInicio: fechaInicioGlobal, fechaFin: fechaFinGlobal },
        type: QueryTypes.SELECT
    });
    const map = new Map();
    rows.forEach(r => {
        const key = `${r.id_vendedor}|${r.id_dim}|${r.tipo_periodo}|${r.fecha_inicio}|${r.fecha_fin}`;
        map.set(key, Number(r.impactos) || 0);
    });
    return map;
}

// Wrappers para uso en diagnóstico (un solo período).
async function calcularImpactosVendedorPeriodo({ idVendedor, fechaInicio, fechaFin }) {
    const map = await calcularImpactosVendedorBatch([{
        id_vendedor: idVendedor,
        tipo_periodo: 'DIAGNOSTICO',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
    }], fechaInicio, fechaFin);
    const key = `${idVendedor}|DIAGNOSTICO|${fechaInicio}|${fechaFin}`;
    return map.get(key) || 0;
}

async function calcularImpactosDimensionPeriodo({ dim, idVendedor, idDim, fechaInicio, fechaFin }) {
    const map = await calcularImpactosDimensionBatch([{
        id_vendedor: idVendedor,
        id_dim: idDim,
        tipo_periodo: 'DIAGNOSTICO',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
    }], dim, fechaInicio, fechaFin);
    const key = `${idVendedor}|${idDim}|DIAGNOSTICO|${fechaInicio}|${fechaFin}`;
    return map.get(key) || 0;
}

async function calcularVendedores(ctx) {
    const { fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, scope, filtros } = ctx;

    const periodos = await obtenerPeriodosCuota({
        cuotaTable: TIPOS.vendedores.cuotaTable,
        fechaInicio,
        fechaFin,
        tipoPeriodo,
        scope,
        idsCanalCiudad,
        filtros
    });

    if (!periodos.length) {
        return { success: true, tipo: 'vendedores', total: 0, rows: [] };
    }

    const idsVendedor = [...new Set(periodos.map(p => p.id_vendedor))];
    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor IN (:ids)',
        { replacements: { ids: idsVendedor }, type: QueryTypes.SELECT }
    );
    const vendedorMap = new Map(vendedorRows.map(v => [v.id_vendedor, v]));

    const impactosMap = await calcularImpactosVendedorBatch(periodos, fechaInicio, fechaFin);

    const rows = [];
    for (const periodo of periodos) {
        const key = `${periodo.id_vendedor}|${periodo.tipo_periodo}|${periodo.fecha_inicio}|${periodo.fecha_fin}`;
        const impactos = impactosMap.get(key) || 0;

        const v = vendedorMap.get(periodo.id_vendedor);
        const cuota = Number(periodo.cuota_total) || 0;

        rows.push({
            vendedor: v ? `${padCode(v.codigo_vendedor)} - ${v.nombre}` : `ID ${periodo.id_vendedor}`,
            tipoPeriodo: periodo.tipo_periodo,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin,
            ...formatRow(cuota, impactos)
        });
    }

    rows.sort((a, b) => {
        const cmpVendedor = String(a.vendedor).localeCompare(String(b.vendedor), 'es', { numeric: false, sensitivity: 'base' });
        if (cmpVendedor !== 0) return cmpVendedor;
        const cmpPeriodo = String(a.tipoPeriodo).localeCompare(String(b.tipoPeriodo));
        if (cmpPeriodo !== 0) return cmpPeriodo;
        return String(a.fechaInicio).localeCompare(String(b.fechaInicio));
    });

    return { success: true, tipo: 'vendedores', total: rows.length, rows };
}

async function calcularDimension(ctx, dim) {
    const { cuotaTable, fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, scope, filtros } = ctx;
    const isProv = dim === 'proveedor';
    const dimTable = isProv ? 'proveedor' : 'categoria';
    const dimCol = isProv ? 'id_proveedor' : 'id_categoria';
    const dimKey = isProv ? 'proveedor' : 'categoria';

    const periodos = await obtenerPeriodosDimensionCuota({
        cuotaTable,
        dimCol,
        fechaInicio,
        fechaFin,
        tipoPeriodo,
        scope,
        idsCanalCiudad,
        filtros
    });

    if (!periodos.length) {
        return { success: true, tipo: isProv ? 'proveedores' : 'categorias', total: 0, rows: [] };
    }

    const idsVendedor = [...new Set(periodos.map(p => p.id_vendedor))];
    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor IN (:ids)',
        { replacements: { ids: idsVendedor }, type: QueryTypes.SELECT }
    );
    const vendedorMap = new Map(vendedorRows.map(v => [v.id_vendedor, v]));

    const idsDim = [...new Set(periodos.map(p => p.id_dim))];
    const dimRows = await sequelize.query(
        `SELECT ${dimCol} AS id_dim, nombre FROM ${dimTable} WHERE ${dimCol} IN (:ids)`,
        { replacements: { ids: idsDim }, type: QueryTypes.SELECT }
    );
    const dimMap = new Map(dimRows.map(d => [d.id_dim, d]));

    const impactosMap = await calcularImpactosDimensionBatch(periodos, dim, fechaInicio, fechaFin);

    const rows = [];
    for (const periodo of periodos) {
        const key = `${periodo.id_vendedor}|${periodo.id_dim}|${periodo.tipo_periodo}|${periodo.fecha_inicio}|${periodo.fecha_fin}`;
        const impactos = impactosMap.get(key) || 0;

        const v = vendedorMap.get(periodo.id_vendedor);
        const d = dimMap.get(periodo.id_dim);
        const cuota = Number(periodo.cuota_total) || 0;

        rows.push({
            vendedor: v ? `${padCode(v.codigo_vendedor)} - ${v.nombre}` : `ID ${periodo.id_vendedor}`,
            [dimKey]: isProv ? d?.nombre : extractCategoryName(d?.nombre),
            tipoPeriodo: periodo.tipo_periodo,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin,
            ...formatRow(cuota, impactos)
        });
    }

    rows.sort((a, b) => {
        const cmpVendedor = String(a.vendedor).localeCompare(String(b.vendedor), 'es', { numeric: false, sensitivity: 'base' });
        if (cmpVendedor !== 0) return cmpVendedor;
        const cmpDim = String(a[dimKey]).localeCompare(String(b[dimKey]), 'es', { sensitivity: 'base' });
        if (cmpDim !== 0) return cmpDim;
        const cmpPeriodo = String(a.tipoPeriodo).localeCompare(String(b.tipoPeriodo));
        if (cmpPeriodo !== 0) return cmpPeriodo;
        return String(a.fechaInicio).localeCompare(String(b.fechaInicio));
    });

    return { success: true, tipo: isProv ? 'proveedores' : 'categorias', total: rows.length, rows };
}

async function resolverProveedorPorCodigo(codigo) {
    const rows = await sequelize.query(
        'SELECT id_proveedor FROM proveedor WHERE codigo = :cod OR nombre = :cod',
        { replacements: { cod: String(codigo ?? '').trim() }, type: QueryTypes.SELECT }
    );
    return rows.map(r => r.id_proveedor);
}

async function resolverCategoriaPorNombre(nombre) {
    const buscado = String(nombre ?? '').trim();
    if (!buscado) return [];

    // Primero intentar coincidencia exacta con el nombre completo de BD.
    const exact = await sequelize.query(
        'SELECT id_categoria FROM categoria WHERE nombre = :nom',
        { replacements: { nom: buscado }, type: QueryTypes.SELECT }
    );
    if (exact.length) return exact.map(r => r.id_categoria);

    // Si no, buscar comparando la parte descriptiva (sin el prefijo "XXXX - ").
    const all = await sequelize.query(
        'SELECT id_categoria, nombre FROM categoria',
        { type: QueryTypes.SELECT }
    );
    const matches = all.filter(c => extractCategoryName(c.nombre) === buscado);
    return matches.map(r => r.id_categoria);
}

async function diagnosticarImpactos({ tipo = 'cliente', codigoVendedor, dimCodigo, fechaInicio, fechaFin, scope }) {
    if (!codigoVendedor) throw new Error('codigoVendedor es requerido');
    if (!fechaInicio || !fechaFin) throw new Error('fechaInicio y fechaFin son requeridos');
    if (!['cliente', 'proveedor', 'categoria'].includes(tipo)) {
        throw new Error('tipo debe ser cliente, proveedor o categoria');
    }

    const idsVend = await resolverVendedoresPorCodigo(codigoVendedor);
    if (!idsVend.length) throw new Error(`Vendedor con código ${codigoVendedor} no encontrado`);

    let idVendedor = idsVend[0];

    if (scope && scope.tipo !== 'all') {
        const allowed = scope.tipo === 'self' ? [scope.idVendedor] : scope.idsVendedor;
        const intersection = idsVend.filter(id => allowed.includes(id));
        if (!intersection.length) {
            throw new Error('Vendedor fuera del alcance de su rol');
        }
        idVendedor = intersection[0];
    }

    let idDim = null;
    let dimInfo = null;
    if (tipo === 'proveedor') {
        if (!dimCodigo) throw new Error('dimCodigo es requerido para tipo=proveedor');
        const ids = await resolverProveedorPorCodigo(dimCodigo);
        if (!ids.length) throw new Error(`Proveedor ${dimCodigo} no encontrado`);
        idDim = ids[0];
        const [info] = await sequelize.query(
            'SELECT id_proveedor, codigo, nombre FROM proveedor WHERE id_proveedor = :id',
            { replacements: { id: idDim }, type: QueryTypes.SELECT }
        );
        dimInfo = info;
    } else if (tipo === 'categoria') {
        if (!dimCodigo) throw new Error('dimCodigo es requerido para tipo=categoria');
        const ids = await resolverCategoriaPorNombre(dimCodigo);
        if (!ids.length) throw new Error(`Categoría ${dimCodigo} no encontrada`);
        idDim = ids[0];
        const [info] = await sequelize.query(
            'SELECT id_categoria, nombre FROM categoria WHERE id_categoria = :id',
            { replacements: { id: idDim }, type: QueryTypes.SELECT }
        );
        dimInfo = info;
    }

    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor = :id',
        { replacements: { id: idVendedor }, type: QueryTypes.SELECT, plain: true }
    );

    const replacements = { idVendedor, fechaInicio, fechaFin };
    let sqlDiagnostico;
    let impactos;

    if (tipo === 'cliente') {
        sqlDiagnostico = `
            WITH cliente_resumen AS (
                SELECT
                    v.id_cliente,
                    SUM(
                        CASE
                            WHEN dv.subtotal = 0 THEN 0
                            ELSE dv.subtotal
                        END
                    ) AS subtotal_neto,
                    COUNT(*) AS total_ventas_cliente
                FROM venta v
                JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                WHERE v.id_vendedor = :idVendedor
                  AND v.fecha >= :fechaInicio
                  AND v.fecha <= :fechaFin
                GROUP BY v.id_cliente
            )
            SELECT
                (SELECT COUNT(*) FROM venta WHERE id_vendedor = :idVendedor AND fecha >= :fechaInicio AND fecha <= :fechaFin) AS total_ventas,
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta WHERE v.id_vendedor = :idVendedor AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin AND dv.subtotal > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%') AS ventas_validas,
                (SELECT COUNT(*) FROM venta WHERE id_vendedor = :idVendedor AND fecha >= :fechaInicio AND fecha <= :fechaFin AND UPPER(TRIM(numero_documento)) LIKE 'NC%') AS nc_descartadas,
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta WHERE v.id_vendedor = :idVendedor AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin AND dv.subtotal <= 0) AS valor_invalido_descartado,
                COUNT(*) AS clientes_unicos_validos,
                SUM(CASE WHEN subtotal_neto > 0 THEN 1 ELSE 0 END) AS clientes_con_subtotal_positivo,
                SUM(CASE WHEN subtotal_neto <= 0 THEN 1 ELSE 0 END) AS clientes_excluidos_por_subtotal,
                SUM(subtotal_neto) AS subtotal_total
            FROM cliente_resumen
        `;
        impactos = await calcularImpactosVendedorPeriodo({ idVendedor, fechaInicio, fechaFin });
    } else {
        const dimCol = tipo === 'proveedor' ? 'id_proveedor' : 'id_categoria';
        replacements.idDim = idDim;

        const groupExpr = tipo === 'categoria'
            ? "CONCAT(i.id_proveedor::text, '-', v.id_cliente::text)"
            : 'v.id_cliente';

        sqlDiagnostico = `
            WITH grupo_resumen AS (
                SELECT
                    ${groupExpr} AS grupo,
                    SUM(
                        CASE
                            WHEN dv.subtotal = 0 THEN 0
                            ELSE dv.subtotal
                        END
                    ) AS subtotal_neto,
                    COUNT(*) AS total_ventas_grupo
                FROM venta v
                JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE v.id_vendedor = :idVendedor
                  AND i.${dimCol} = :idDim
                  AND v.fecha >= :fechaInicio
                  AND v.fecha <= :fechaFin
                GROUP BY ${groupExpr}
            )
            SELECT
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta JOIN item i ON i.id_item = dv.id_item WHERE v.id_vendedor = :idVendedor AND i.${dimCol} = :idDim AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin) AS total_ventas,
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta JOIN item i ON i.id_item = dv.id_item WHERE v.id_vendedor = :idVendedor AND i.${dimCol} = :idDim AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin AND dv.subtotal > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%') AS ventas_validas,
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta JOIN item i ON i.id_item = dv.id_item WHERE v.id_vendedor = :idVendedor AND i.${dimCol} = :idDim AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin AND UPPER(TRIM(v.numero_documento)) LIKE 'NC%') AS nc_descartadas,
                (SELECT COUNT(*) FROM venta v JOIN detalle_venta dv ON dv.id_venta = v.id_venta JOIN item i ON i.id_item = dv.id_item WHERE v.id_vendedor = :idVendedor AND i.${dimCol} = :idDim AND v.fecha >= :fechaInicio AND v.fecha <= :fechaFin AND dv.subtotal <= 0) AS valor_invalido_descartado,
                COUNT(*) AS clientes_unicos_validos,
                SUM(CASE WHEN subtotal_neto > 0 THEN 1 ELSE 0 END) AS clientes_con_subtotal_positivo,
                SUM(CASE WHEN subtotal_neto <= 0 THEN 1 ELSE 0 END) AS clientes_excluidos_por_subtotal,
                SUM(subtotal_neto) AS subtotal_total
            FROM grupo_resumen
        `;
        impactos = await calcularImpactosDimensionPeriodo({ dim: tipo, idVendedor, idDim, fechaInicio, fechaFin });
    }

    const [diagnostico] = await sequelize.query(sqlDiagnostico, { replacements, type: QueryTypes.SELECT });

    return {
        success: true,
        tipo,
        vendedor: {
            id: vendedorRows?.id_vendedor,
            codigo: vendedorRows?.codigo_vendedor,
            nombre: vendedorRows?.nombre
        },
        dimension: dimInfo,
        periodo: { fechaInicio, fechaFin },
        diagnostico: {
            total_ventas: Number(diagnostico.total_ventas) || 0,
            ventas_validas: Number(diagnostico.ventas_validas) || 0,
            nc_descartadas: Number(diagnostico.nc_descartadas) || 0,
            valor_invalido_descartado: Number(diagnostico.valor_invalido_descartado) || 0,
            clientes_unicos_validos: Number(diagnostico.clientes_unicos_validos) || 0,
            clientes_con_subtotal_positivo: Number(diagnostico.clientes_con_subtotal_positivo) || 0,
            clientes_excluidos_por_subtotal: Number(diagnostico.clientes_excluidos_por_subtotal) || 0,
            subtotal_total: Number(diagnostico.subtotal_total) || 0
        },
        impactos
    };
}

async function calcularImpactos(tipo, filtros = {}, scope = null) {
    const cfg = TIPOS[tipo];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: vendedores, proveedores o categorias.');
    }

    const replacements = {};
    let dateRow = await sequelize.query(
        `SELECT MIN(fecha_inicio) AS mi, MAX(fecha_fin) AS mf FROM ${cfg.cuotaTable}`,
        { type: QueryTypes.SELECT, plain: true }
    );
    if (!dateRow?.mi) {
        dateRow = await sequelize.query(
            `SELECT MIN(fecha) AS mi, MAX(fecha) AS mf FROM venta`,
            { type: QueryTypes.SELECT, plain: true }
        );
    }
    const fechaInicio = filtros.fechaInicio || dateRow?.mi || null;
    const fechaFin = filtros.fechaFin || dateRow?.mf || null;
    const tipoPeriodo = toArr(filtros.tipoPeriodo).length
        ? toArr(filtros.tipoPeriodo)
        : inferirTipoPeriodo(fechaInicio, fechaFin);

    const idsCanalCiudad = await resolverVendedoresPorCanalCiudad(filtros);

    const base = { fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, replacements, scope, filtros };

    if (tipo === 'vendedores') {
        return await calcularVendedores(base);
    }
    if (tipo === 'proveedores') {
        return await calcularDimension({ ...base, cuotaTable: cfg.cuotaTable }, 'proveedor');
    }
    return await calcularDimension({ ...base, cuotaTable: cfg.cuotaTable }, 'categoria');
}

module.exports = {
    calcularImpactos,
    diagnosticarImpactos,
    _test: { toArr, padCode, extractCategoryName, buildScopeCond }
};
