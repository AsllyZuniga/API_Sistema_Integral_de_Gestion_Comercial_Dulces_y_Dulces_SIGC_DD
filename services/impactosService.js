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

    const expanded = new Set();
    list.forEach(c => {
        const raw = String(c ?? '').trim();
        expanded.add(raw);
        if (/^\d+$/.test(raw)) {
            expanded.add(String(Number(raw)));
            expanded.add(String(Number(raw)).padStart(4, '0'));
        }
    });

    const rows = await sequelize.query(
        'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor IN (:codigos)',
        { replacements: { codigos: [...expanded] }, type: QueryTypes.SELECT }
    );
    return rows.map(r => r.id_vendedor);
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

async function calcularVendedores(ctx) {
    const { fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, replacements, scope, filtros } = ctx;

    const cuotaConds = [];
    if (fechaInicio) { cuotaConds.push('cu.fecha_fin >= :fechaInicio'); replacements.fechaInicio = fechaInicio; }
    if (fechaFin) { cuotaConds.push('cu.fecha_inicio <= :fechaFin'); replacements.fechaFin = fechaFin; }
    cuotaConds.push('cu.tipo_periodo IN (:tipoPeriodo)');
    replacements.tipoPeriodo = tipoPeriodo;
    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) cuotaConds.push(scopeCuota);

    const ventaConds = ['v.valor_neto > 0'];
    if (fechaInicio) ventaConds.push('v.fecha >= :fechaInicio');
    if (fechaFin) ventaConds.push('v.fecha <= :fechaFin');
    const scopeVenta = buildScopeCond(scope, 'v.id_vendedor', replacements, 'vv');
    if (scopeVenta) ventaConds.push(scopeVenta);
    const condCc = buildCondCanalCiudad(idsCanalCiudad, 'v.id_vendedor', replacements, 'ccVend');
    if (condCc) ventaConds.push(condCc);

    const outerConds = ['(COALESCE(cq.cuota_total, 0) > 0 OR COALESCE(im.impactos, 0) > 0)'];
    const scopeOuter = buildScopeCond(scope, 'v.id_vendedor', replacements, 'vo');
    if (scopeOuter) outerConds.push(scopeOuter);

    if (filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            outerConds.push('v.id_vendedor IN (:vendFiltro)');
        } else {
            outerConds.push('v.id_vendedor = -1');
        }
    }
    const condCcOuter = buildCondCanalCiudad(idsCanalCiudad, 'v.id_vendedor', replacements, 'ccVendOuter');
    if (condCcOuter) outerConds.push(condCcOuter);

    const sql = `
        SELECT
            v.codigo_vendedor AS codigo,
            v.nombre AS nombre,
            COALESCE(cq.cuota_total, 0)::int AS "cuotaImpactos",
            COALESCE(im.impactos, 0)::int AS "impactos"
        FROM vendedor v
        LEFT JOIN (
            SELECT cu.id_vendedor, SUM(cu.cuota) AS cuota_total
            FROM ${TIPOS.vendedores.cuotaTable} cu
            WHERE ${cuotaConds.join(' AND ')}
            GROUP BY cu.id_vendedor
        ) cq ON cq.id_vendedor = v.id_vendedor
        LEFT JOIN (
            SELECT v.id_vendedor, COUNT(DISTINCT v.id_cliente) AS impactos
            FROM venta v
            WHERE ${ventaConds.join(' AND ')}
            GROUP BY v.id_vendedor
        ) im ON im.id_vendedor = v.id_vendedor
        WHERE ${outerConds.join(' AND ')}
        ORDER BY v.codigo_vendedor ASC
    `;

    const data = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    const rows = data.map(r => ({
        vendedor: `${padCode(r.codigo)} - ${r.nombre}`,
        ...formatRow(r.cuotaImpactos, r.impactos)
    }));

    return { success: true, tipo: 'vendedores', total: rows.length, rows };
}

async function calcularDimension(ctx, dim) {
    const { cuotaTable, fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, replacements, scope, filtros } = ctx;
    const isProv = dim === 'proveedor';
    const dimTable = isProv ? 'proveedor' : 'categoria';
    const dimCol = isProv ? 'id_proveedor' : 'id_categoria';

    const cuotaConds = [];
    if (fechaInicio) { cuotaConds.push('cu.fecha_fin >= :fechaInicio'); replacements.fechaInicio = fechaInicio; }
    if (fechaFin) { cuotaConds.push('cu.fecha_inicio <= :fechaFin'); replacements.fechaFin = fechaFin; }
    cuotaConds.push('cu.tipo_periodo IN (:tipoPeriodo)');
    replacements.tipoPeriodo = tipoPeriodo;
    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) cuotaConds.push(scopeCuota);

    const dimFilters = isProv ? toArr(filtros.proveedor) : toArr(filtros.categoria);
    if (dimFilters.length) {
        replacements.dimFiltro = dimFilters;
        cuotaConds.push(`cu.${dimCol} IN (:dimFiltro)`);
    }

    const ventaConds = ['v.valor_neto > 0'];
    if (fechaInicio) ventaConds.push('v.fecha >= :fechaInicio');
    if (fechaFin) ventaConds.push('v.fecha <= :fechaFin');
    const scopeVenta = buildScopeCond(scope, 'v.id_vendedor', replacements, 'vv');
    if (scopeVenta) ventaConds.push(scopeVenta);
    const condCc = buildCondCanalCiudad(idsCanalCiudad, 'v.id_vendedor', replacements, 'ccVend');
    if (condCc) ventaConds.push(condCc);
    if (dimFilters.length) ventaConds.push(`i.${dimCol} IN (:dimFiltro)`);

    if (filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            ventaConds.push('v.id_vendedor IN (:vendFiltro)');
        } else {
            ventaConds.push('v.id_vendedor = -1');
        }
    }

    const outerConds = ['(COALESCE(cq.cuota_total, 0) > 0 OR COALESCE(im.impactos, 0) > 0)'];

    const sql = `
        SELECT
            p.nombre AS nombre,
            COALESCE(cq.cuota_total, 0)::int AS "cuotaImpactos",
            COALESCE(im.impactos, 0)::int AS "impactos"
        FROM (SELECT DISTINCT nombre FROM ${dimTable}) p
        LEFT JOIN (
            SELECT dp.nombre AS dim_nombre, SUM(cu.cuota) AS cuota_total
            FROM ${cuotaTable} cu
            JOIN ${dimTable} dp ON dp.${dimCol} = cu.${dimCol}
            WHERE ${cuotaConds.join(' AND ')}
            GROUP BY dp.nombre
        ) cq ON cq.dim_nombre = p.nombre
        LEFT JOIN (
            SELECT dp.nombre AS dim_nombre, COUNT(DISTINCT v.id_cliente) AS impactos
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item i ON i.id_item = dv.id_item
            JOIN ${dimTable} dp ON dp.${dimCol} = i.${dimCol}
            WHERE ${ventaConds.join(' AND ')}
            GROUP BY dp.nombre
        ) im ON im.dim_nombre = p.nombre
        WHERE ${outerConds.join(' AND ')}
        ORDER BY p.nombre ASC
    `;

    const data = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    const rows = data.map(r => {
        const row = formatRow(r.cuotaImpactos, r.impactos);
        row[dim] = isProv ? r.nombre : extractCategoryName(r.nombre);
        return row;
    });

    return { success: true, tipo: isProv ? 'proveedores' : 'categorias', total: rows.length, rows };
}

async function calcularImpactos(tipo, filtros = {}, scope = null) {
    const cfg = TIPOS[tipo];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: vendedores, proveedores o categorias.');
    }

    const replacements = {};
    const tipoPeriodo = toArr(filtros.tipoPeriodo).length ? toArr(filtros.tipoPeriodo) : ['MENSUAL'];

    const dateRow = await sequelize.query(
        `SELECT MIN(fecha_inicio) AS mi, MAX(fecha_fin) AS mf FROM ${cfg.cuotaTable}`,
        { type: QueryTypes.SELECT, plain: true }
    );
    const fechaInicio = filtros.fechaInicio || dateRow?.mi || null;
    const fechaFin = filtros.fechaFin || dateRow?.mf || null;

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
    _test: { toArr, padCode, extractCategoryName, buildScopeCond }
};
