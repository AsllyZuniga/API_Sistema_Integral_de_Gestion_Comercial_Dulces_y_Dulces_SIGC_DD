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

async function resolverCodigosProveedor(ids) {
    if (!ids || ids.length === 0) return [];
    const filas = await sequelize.query(
        `SELECT DISTINCT codigo FROM proveedor WHERE id_proveedor IN (:ids) AND codigo IS NOT NULL AND codigo != ''`,
        { replacements: { ids }, type: QueryTypes.SELECT }
    );
    return filas.map(f => String(f.codigo).trim()).filter(Boolean);
}

async function getOpcionesFiltrosImpactos(params, scope) {
    const { fechaInicio, fechaFin, codVendedor, codProveedor, codCategoria } = params;
    const tipoPeriodo = inferirTipoPeriodo();

    const replacements = { fechaInicio, fechaFin, tipoPeriodo };

    const scopeVd = buildScopeCond(scope, 'vd.id_vendedor', replacements, 'sc_vd');
    const scopeCu = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'sc_cu');
    const scopeV = buildScopeCond(scope, 'v.id_vendedor', replacements, 'sc_v');

    const vendedorIds = await resolverVendedoresPorCodigo(codVendedor);
    if (vendedorIds.length > 0) {
        vendedorIds.forEach((id, i) => { replacements[`vf${i}`] = id; });
    }

    const proveedorIds = toArr(codProveedor);
    if (proveedorIds.length > 0) {
        proveedorIds.forEach((id, i) => { replacements[`pf${i}`] = id; });
    }

    const categoriaIds = toArr(codCategoria);
    if (categoriaIds.length > 0) {
        categoriaIds.forEach((id, i) => { replacements[`cf${i}`] = id; });
    }

    const codigosProveedor = await resolverCodigosProveedor(proveedorIds);
    if (codigosProveedor.length > 0) {
        codigosProveedor.forEach((cod, i) => { replacements[`pc${i}`] = cod; });
    }

    const vdByIds = vendedorIds.length > 0 ? vendedorIds.map((_, i) => `:vf${i}`).join(',') : null;
    const pfByIds = proveedorIds.length > 0 ? proveedorIds.map((_, i) => `:pf${i}`).join(',') : null;
    const cfByIds = categoriaIds.length > 0 ? categoriaIds.map((_, i) => `:cf${i}`).join(',') : null;
    const pcByIds = codigosProveedor.length > 0 ? codigosProveedor.map((_, i) => `:pc${i}`).join(',') : null;

    const vdByProv = pfByIds ? `
        AND vd.id_vendedor IN (
            SELECT DISTINCT ip.id_vendedor FROM impactos_proveedor ip
            WHERE ip.id_proveedor IN (${pfByIds})
            AND ip.fecha_fin >= :fechaInicio AND ip.fecha_inicio <= :fechaFin
            AND ip.tipo_periodo IN (:tipoPeriodo)
            ${pcByIds ? `UNION
            SELECT DISTINCT v2.id_vendedor FROM venta v2
            JOIN detalle_venta dv ON dv.id_venta = v2.id_venta
            JOIN (SELECT DISTINCT ON (codigo) id_proveedor, codigo FROM proveedor ORDER BY codigo, id_proveedor) pr
                ON pr.codigo = UPPER(TRIM(SPLIT_PART(COALESCE(dv.reporte_prov_con_obs, ''), ' - ', 1)))
            WHERE v2.fecha >= :fechaInicio AND v2.fecha <= :fechaFin
            AND pr.codigo IN (${pcByIds})` : ''}
        )` : '';

    const vdByCat = cfByIds ? `
        AND vd.id_vendedor IN (
            SELECT DISTINCT ic.id_vendedor FROM impactos_categoria ic
            WHERE ic.id_categoria IN (${cfByIds})
            AND ic.fecha_fin >= :fechaInicio AND ic.fecha_inicio <= :fechaFin
            AND ic.tipo_periodo IN (:tipoPeriodo)
            UNION
            SELECT DISTINCT v3.id_vendedor FROM venta v3
            JOIN detalle_venta dv2 ON dv2.id_venta = v3.id_venta
            JOIN item i2 ON i2.id_item = dv2.id_item
            WHERE v3.fecha >= :fechaInicio AND v3.fecha <= :fechaFin
            AND i2.id_categoria IN (${cfByIds})
        )` : '';

    const provByCat = cfByIds ? `
        AND pr.id_proveedor IN (
            SELECT DISTINCT ip2.id_proveedor FROM impactos_proveedor ip2
            INNER JOIN impactos_categoria ic2 ON ic2.id_vendedor = ip2.id_vendedor
            WHERE ic2.id_categoria IN (${cfByIds})
            AND ic2.fecha_fin >= :fechaInicio AND ic2.fecha_inicio <= :fechaFin
            AND ic2.tipo_periodo IN (:tipoPeriodo)
            AND ip2.fecha_fin >= :fechaInicio AND ip2.fecha_inicio <= :fechaFin
            AND ip2.tipo_periodo IN (:tipoPeriodo)
            UNION
            SELECT DISTINCT pr3.id_proveedor
            FROM venta v4
            JOIN detalle_venta dv3 ON dv3.id_venta = v4.id_venta
            JOIN item i3 ON i3.id_item = dv3.id_item
            JOIN (SELECT DISTINCT ON (codigo) id_proveedor, codigo FROM proveedor ORDER BY codigo, id_proveedor) pr3
                ON pr3.codigo = UPPER(TRIM(SPLIT_PART(COALESCE(dv3.reporte_prov_con_obs, ''), ' - ', 1)))
            WHERE v4.fecha >= :fechaInicio AND v4.fecha <= :fechaFin
            AND i3.id_categoria IN (${cfByIds})
        )` : '';

    const provByVd = vdByIds ? `
        AND pr.id_proveedor IN (
            SELECT DISTINCT ip3.id_proveedor FROM impactos_proveedor ip3
            WHERE ip3.id_vendedor IN (${vdByIds})
            AND ip3.fecha_fin >= :fechaInicio AND ip3.fecha_inicio <= :fechaFin
            AND ip3.tipo_periodo IN (:tipoPeriodo)
            UNION
            SELECT DISTINCT pr4.id_proveedor
            FROM venta v5
            JOIN detalle_venta dv4 ON dv4.id_venta = v5.id_venta
            JOIN (SELECT DISTINCT ON (codigo) id_proveedor, codigo FROM proveedor ORDER BY codigo, id_proveedor) pr4
                ON pr4.codigo = UPPER(TRIM(SPLIT_PART(COALESCE(dv4.reporte_prov_con_obs, ''), ' - ', 1)))
            WHERE v5.fecha >= :fechaInicio AND v5.fecha <= :fechaFin
            AND v5.id_vendedor IN (${vdByIds})
        )` : '';

    const catByVd = vdByIds ? `
        AND cat.id_categoria IN (
            SELECT DISTINCT ic3.id_categoria FROM impactos_categoria ic3
            WHERE ic3.id_vendedor IN (${vdByIds})
            AND ic3.fecha_fin >= :fechaInicio AND ic3.fecha_inicio <= :fechaFin
            AND ic3.tipo_periodo IN (:tipoPeriodo)
            UNION
            SELECT DISTINCT i4.id_categoria
            FROM venta v6
            JOIN detalle_venta dv5 ON dv5.id_venta = v6.id_venta
            JOIN item i4 ON i4.id_item = dv5.id_item
            WHERE v6.fecha >= :fechaInicio AND v6.fecha <= :fechaFin
            AND v6.id_vendedor IN (${vdByIds})
        )` : '';

    const [vendedores, proveedores, categorias] = await Promise.all([
        sequelize.query(`
            SELECT DISTINCT vd.id_vendedor, vd.codigo_vendedor, vd.nombre
            FROM vendedor vd
            WHERE vd.id_vendedor IN (
                SELECT DISTINCT cu.id_vendedor FROM impactos_cliente cu
                WHERE cu.fecha_fin >= :fechaInicio AND cu.fecha_inicio <= :fechaFin
                AND cu.tipo_periodo IN (:tipoPeriodo)
                UNION
                SELECT DISTINCT v.id_vendedor FROM venta v
                WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin
            )
            ${scopeVd ? 'AND ' + scopeVd : ''}
            ${vdByProv}
            ${vdByCat}
            ORDER BY vd.codigo_vendedor
        `, { replacements: { ...replacements }, type: QueryTypes.SELECT }),

        sequelize.query(`
            SELECT DISTINCT pr.id_proveedor, pr.nombre
            FROM proveedor pr
            WHERE pr.id_proveedor IN (
                SELECT DISTINCT cu.id_proveedor FROM impactos_proveedor cu
                WHERE cu.fecha_fin >= :fechaInicio AND cu.fecha_inicio <= :fechaFin
                AND cu.tipo_periodo IN (:tipoPeriodo)
                ${scopeCu ? 'AND ' + scopeCu : ''}
                UNION
                SELECT DISTINCT pr2.id_proveedor
                FROM venta v
                JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                JOIN (SELECT DISTINCT ON (codigo) id_proveedor, codigo FROM proveedor ORDER BY codigo, id_proveedor) pr2
                    ON pr2.codigo = UPPER(TRIM(SPLIT_PART(COALESCE(dv.reporte_prov_con_obs, ''), ' - ', 1)))
                WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin
                ${scopeV ? 'AND ' + scopeV : ''}
            )
            ${provByVd}
            ${provByCat}
            ORDER BY pr.nombre
        `, { replacements: { ...replacements }, type: QueryTypes.SELECT }),

        sequelize.query(`
            SELECT DISTINCT cat.id_categoria, cat.nombre
            FROM categoria cat
            WHERE cat.id_categoria IN (
                SELECT DISTINCT cu.id_categoria FROM impactos_categoria cu
                WHERE cu.fecha_fin >= :fechaInicio AND cu.fecha_inicio <= :fechaFin
                AND cu.tipo_periodo IN (:tipoPeriodo)
                ${scopeCu ? 'AND ' + scopeCu : ''}
                UNION
                SELECT DISTINCT i.id_categoria
                FROM venta v
                JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                JOIN item i ON i.id_item = dv.id_item
                WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin
                ${scopeV ? 'AND ' + scopeV : ''}
            )
            ${catByVd}
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
