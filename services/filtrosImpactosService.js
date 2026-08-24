'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

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

function inferirTipoPeriodo() {
    return ['MENSUAL', 'SEMANAL'];
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

async function resolverVendedoresPorCodigo(codigos) {
    const list = toArr(codigos);
    if (!list.length) return [];

    const ids = [];
    for (const c of list) {
        const raw = String(c ?? '').trim();
        if (!raw) continue;

        const padded = /^\d+$/.test(raw) ? String(Number(raw)).padStart(4, '0') : raw;
        const [paddedRow] = await sequelize.query(
            'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor = :padded',
            { replacements: { padded }, type: QueryTypes.SELECT }
        );
        if (paddedRow) {
            ids.push(paddedRow.id_vendedor);
            continue;
        }

        const [rawRow] = await sequelize.query(
            'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor = :raw',
            { replacements: { raw }, type: QueryTypes.SELECT }
        );
        if (rawRow) {
            ids.push(rawRow.id_vendedor);
        }
    }

    return [...new Set(ids)];
}

function normalizeParams(query) {
    const fechaInicio = query.fechaInicio || null;
    const fechaFin = query.fechaFin || null;

    const now = new Date();
    const defaultInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    return {
        fechaInicio: fechaInicio || defaultInicio,
        fechaFin: fechaFin || defaultFin,
        codVendedor: toArr(query.codVendedor || query.vendedor),
        codProveedor: toArr(query.codProveedor || query.proveedor),
        codCategoria: toArr(query.codCategoria || query.categoria)
    };
}

async function getOpcionesFiltrosImpactos(params, scope) {
    const { fechaInicio, fechaFin, codVendedor, codProveedor, codCategoria } = params;
    const tipoPeriodo = inferirTipoPeriodo();

    const replacements = {
        fechaInicio,
        fechaFin,
        tipoPeriodo
    };

    const scopeCond = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'sc');

    const vendedorIds = await resolverVendedoresPorCodigo(codVendedor);
    let vendedorCond = '';
    if (vendedorIds.length > 0) {
        const placeholders = vendedorIds.map((_, i) => `:vf${i}`).join(',');
        vendedorIds.forEach((id, i) => { replacements[`vf${i}`] = id; });
        vendedorCond = `AND cu.id_vendedor IN (${placeholders})`;
    } else if (codVendedor.length > 0) {
        vendedorCond = 'AND cu.id_vendedor = -1';
    }

    const proveedorIds = toArr(codProveedor);
    let proveedorCond = '';
    if (proveedorIds.length > 0) {
        const placeholders = proveedorIds.map((_, i) => `:pf${i}`).join(',');
        proveedorIds.forEach((id, i) => { replacements[`pf${i}`] = id; });
        proveedorCond = `AND cu.id_proveedor IN (${placeholders})`;
    }

    const categoriaIds = toArr(codCategoria);
    let categoriaCond = '';
    if (categoriaIds.length > 0) {
        const placeholders = categoriaIds.map((_, i) => `:cf${i}`).join(',');
        categoriaIds.forEach((id, i) => { replacements[`cf${i}`] = id; });
        categoriaCond = `AND cu.id_categoria IN (${placeholders})`;
    }

    const fechaCond = 'AND cu.fecha_fin >= :fechaInicio AND cu.fecha_inicio <= :fechaFin';
    const tipoCond = 'AND cu.tipo_periodo IN (:tipoPeriodo)';

    const vendedorFilterByProveedor = proveedorIds.length > 0
        ? `INNER JOIN (
            SELECT DISTINCT ip.id_vendedor
            FROM impactos_proveedor ip
            WHERE ip.id_proveedor IN (${proveedorIds.map((_, i) => `:pf${i}`).join(',')})
            AND ip.fecha_fin >= :fechaInicio AND ip.fecha_inicio <= :fechaFin
            AND ip.tipo_periodo IN (:tipoPeriodo)
        ) vpf ON cu.id_vendedor = vpf.id_vendedor`
        : '';

    const vendedorFilterByCategoria = categoriaIds.length > 0
        ? `INNER JOIN (
            SELECT DISTINCT ic.id_vendedor
            FROM impactos_categoria ic
            WHERE ic.id_categoria IN (${categoriaIds.map((_, i) => `:cf${i}`).join(',')})
            AND ic.fecha_fin >= :fechaInicio AND ic.fecha_inicio <= :fechaFin
            AND ic.tipo_periodo IN (:tipoPeriodo)
        ) vcf ON cu.id_vendedor = vcf.id_vendedor`
        : '';

    const proveedorFilterByCategoria = categoriaIds.length > 0
        ? `INNER JOIN (
            SELECT DISTINCT ip.id_vendedor
            FROM impactos_proveedor ip
            INNER JOIN impactos_categoria ic ON ic.id_vendedor = ip.id_vendedor
            WHERE ic.id_categoria IN (${categoriaIds.map((_, i) => `:cf${i}`).join(',')})
            AND ic.fecha_fin >= :fechaInicio AND ic.fecha_inicio <= :fechaFin
            AND ic.tipo_periodo IN (:tipoPeriodo)
            AND ip.fecha_fin >= :fechaInicio AND ip.fecha_inicio <= :fechaFin
            AND ip.tipo_periodo IN (:tipoPeriodo)
        ) pcf ON cu.id_vendedor = pcf.id_vendedor`
        : '';

    const [vendedores, proveedores, categorias] = await Promise.all([
        sequelize.query(`
            SELECT DISTINCT cu.id_vendedor, vd.codigo_vendedor, vd.nombre
            FROM impactos_cliente cu
            JOIN vendedor vd ON vd.id_vendedor = cu.id_vendedor
            ${vendedorFilterByProveedor}
            ${vendedorFilterByCategoria}
            WHERE 1=1 ${fechaCond} ${tipoCond} ${scopeCond ? 'AND ' + scopeCond : ''}
            ORDER BY vd.codigo_vendedor
        `, { replacements: { ...replacements }, type: QueryTypes.SELECT }),

        sequelize.query(`
            SELECT DISTINCT cu.id_proveedor, pr.nombre
            FROM impactos_proveedor cu
            JOIN proveedor pr ON pr.id_proveedor = cu.id_proveedor
            ${proveedorFilterByCategoria}
            WHERE 1=1 ${fechaCond} ${tipoCond} ${scopeCond ? 'AND ' + scopeCond : ''}
            ${vendedorCond}
            ORDER BY pr.nombre
        `, { replacements: { ...replacements }, type: QueryTypes.SELECT }),

        sequelize.query(`
            SELECT DISTINCT cu.id_categoria, cat.nombre
            FROM impactos_categoria cu
            JOIN categoria cat ON cat.id_categoria = cu.id_categoria
            WHERE 1=1 ${fechaCond} ${tipoCond} ${scopeCond ? 'AND ' + scopeCond : ''}
            ${vendedorCond}
            ORDER BY cat.nombre
        `, { replacements: { ...replacements }, type: QueryTypes.SELECT })
    ]);

    return {
        periodo: { fechaInicio, fechaFin },
        vendedores: vendedores.map(v => ({
            value: padCode(v.codigo_vendedor),
            label: `${padCode(v.codigo_vendedor)} - ${v.nombre || ''}`.trim()
        })),
        proveedores: proveedores.map(p => ({
            value: String(p.id_proveedor),
            label: p.nombre || ''
        })),
        categorias: categorias.map(c => ({
            value: String(c.id_categoria),
            label: c.nombre || ''
        }))
    };
}

module.exports = {
    normalizeParams,
    getOpcionesFiltrosImpactos
};
