'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { getVendedorScopeFromAuth, buildScopeWhereVenta } = require('../utils/scopeHelper');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toDateOnly = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && DATE_REGEX.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDateOnly = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getMonthRange = (baseDate = new Date()) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
};

const parseArrayParam = (value) => {
    if (value == null || value === '') return [];
    const raw = Array.isArray(value) ? value : String(value).split(',');
    return raw
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0);
};

const normalizeParams = (query = {}) => {
    const fechaInicioStr = query.fechaInicio || null;
    const fechaFinStr = query.fechaFin || null;
    let fechaInicio = toDateOnly(fechaInicioStr);
    let fechaFin = toDateOnly(fechaFinStr);

    if (!fechaInicio || !fechaFin) {
        const base = fechaInicio || fechaFin || new Date();
        const { start, end } = getMonthRange(base);
        fechaInicio = fechaInicio || start;
        fechaFin = fechaFin || end;
    }

    return {
        fechaInicio,
        fechaFin,
        fechaInicioFormatted: formatDateOnly(fechaInicio),
        fechaFinFormatted: formatDateOnly(fechaFin),
        codVendedor: parseArrayParam(query.codVendedor),
        codProveedor: parseArrayParam(query.codProveedor),
        codCategoria: parseArrayParam(query.codCategoria),
        codCiudad: parseArrayParam(query.codCiudad)
    };
};

const buildArrayCondition = (column, values, replacements, prefix) => {
    if (!values || values.length === 0) return '';
    const placeholders = values.map((_, i) => `:${prefix}${i}`).join(',');
    values.forEach((v, i) => { replacements[`${prefix}${i}`] = v; });
    return `${column} IN (${placeholders})`;
};

const buildProveedorCondition = (values, replacements, prefix) => {
    if (!values || values.length === 0) return '';
    const clauses = values.map((p, i) => {
        replacements[`${prefix}E${i}`] = p;
        replacements[`${prefix}L${i}`] = `${p}%`;
        return `(TRIM(dv.reporte_prov_con_obs) = :${prefix}E${i} OR TRIM(dv.reporte_prov_con_obs) LIKE :${prefix}L${i})`;
    });
    return `(${clauses.join(' OR ')})`;
};

/**
 * Construye el fragmento WHERE (sin el `WHERE` inicial) aplicando:
 *   - rango de fechas
 *   - scope JWT (admin/equipo/propio)
 *   - filtros seleccionados, EXCLUYENDO el que se pasa en `exclude`
 *     (clave: 'vendedor' | 'proveedor' | 'categoria' | 'ciudad').
 *
 * Para el filtro de vendedor: para rol 3 (Vendedor) se ignora
 * `params.codVendedor` y se fuerza su propio `codVendedor` del JWT,
 * EXCEPTO cuando `exclude === 'vendedor'` (en ese caso no se aplica
 * la condición de vendor para que su propio dropdown muestre a los
 * demás miembros del equipo? no, sigue mostrando solo a sí mismo
 * porque el scope JWT ya lo restringe a su id_vendedor).
 *
 * Reglas AND entre filtros distintos, OR dentro del mismo filtro.
 */
const buildBaseWhere = (params, replacements, scopeWhereVenta, exclude) => {
    const conditions = ['v.fecha >= :fechaInicio', 'v.fecha <= :fechaFin'];

    replacements.fechaInicio = params.fechaInicio;
    replacements.fechaFin = params.fechaFin;

    if (scopeWhereVenta) {
        conditions.push(scopeWhereVenta.replace(/^\s*AND\s+/i, ''));
    }

    if (exclude !== 'vendedor') {
        let codVendedorFiltro = params.codVendedor;
        const rol = Number(params.rol);
        if (rol === 3) {
            const ownCode = String(params.ownCodVendedor || '').trim();
            codVendedorFiltro = ownCode ? [ownCode] : [];
        }
        if (codVendedorFiltro && codVendedorFiltro.length > 0) {
            const cond = buildArrayCondition(
                'vd.codigo_vendedor',
                codVendedorFiltro,
                replacements,
                'fvend'
            );
            if (cond) conditions.push(cond);
        }
    }

    if (exclude !== 'proveedor' && params.codProveedor && params.codProveedor.length > 0) {
        const cond = buildProveedorCondition(params.codProveedor, replacements, 'fprov');
        if (cond) conditions.push(cond);
    }

    if (exclude !== 'categoria' && params.codCategoria && params.codCategoria.length > 0) {
        const cond = buildArrayCondition(
            'CAST(cat.id_categoria AS TEXT)',
            params.codCategoria,
            replacements,
            'fcat'
        );
        if (cond) conditions.push(cond);
    }

    if (exclude !== 'ciudad' && params.codCiudad && params.codCiudad.length > 0) {
        const cond = buildArrayCondition(
            'CAST(dv.id_ciudad_original AS TEXT)',
            params.codCiudad,
            replacements,
            'fciu'
        );
        if (cond) conditions.push(cond);
    }

    return conditions.join(' AND ');
};

const buildFromClause = () => `
    FROM venta v
    JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
    JOIN detalle_venta dv ON dv.id_venta = v.id_venta
    LEFT JOIN item i ON i.id_item = dv.id_item
    LEFT JOIN proveedor pr ON pr.id_proveedor = i.id_proveedor
    LEFT JOIN categoria cat ON cat.id_categoria = i.id_categoria
    LEFT JOIN ciudad ci ON ci.id_ciudad = dv.id_ciudad_original
`;

const runDistinctQuery = async (selectExpr, where, sharedReplacements) => {
    const replacements = { ...sharedReplacements };
    const query = `SELECT DISTINCT ${selectExpr} ${buildFromClause()} WHERE ${where}`;
    return sequelize.query(query, { replacements, type: QueryTypes.SELECT });
};

/**
 * Devuelve las opciones de los 4 desplegables en cascada.
 *
 * Self-exclusion: la lista del filtro X NO se filtra por X, solo
 * por los OTROS filtros + scope + fecha. Así el usuario siempre ve
 * TODAS las opciones compatibles con su selección actual (puede
 * agregar más).
 *
 * Roles:
 *   - admin: scope 'all' (sin restricción)
 *   - supervisor: solo ve su equipo (scope='team' filtrado por JWT)
 *   - vendedor: scope 'self' (filtrosActivos.codVendedor se ignora,
 *     se fuerza su propio codVendedor)
 */
const getOpcionesFiltros = async (params, auth) => {
    // 1ra pasada: scope JWT (no depende del filtro que se excluya)
    const scope = await getVendedorScopeFromAuth(auth);
    const baseReplacements = {};
    const scopeWhereVenta = buildScopeWhereVenta(scope, 'v.id_vendedor', baseReplacements);

    // Inyectar datos de auth para el manejo de self en buildBaseWhere
    const enrichedParams = {
        ...params,
        rol: auth?.rol,
        ownCodVendedor: auth?.codVendedor
    };

    // 4 queries, una por lista, cada una excluyendo su propio filtro
    const [
        vendedoresRows,
        proveedoresRows,
        categoriasRows,
        ciudadesRows
    ] = await Promise.all([
        runDistinctQuery(
            'vd.id_vendedor, vd.codigo_vendedor, vd.nombre AS vendedor_nombre',
            buildBaseWhere(enrichedParams, baseReplacements, scopeWhereVenta, 'vendedor'),
            baseReplacements
        ),
        runDistinctQuery(
            `TRIM(dv.reporte_prov_con_obs) AS proveedor,
             pr.id_proveedor, pr.nombre AS proveedor_nombre`,
            buildBaseWhere(enrichedParams, baseReplacements, scopeWhereVenta, 'proveedor'),
            baseReplacements
        ),
        runDistinctQuery(
            'cat.id_categoria, cat.nombre AS categoria_nombre',
            buildBaseWhere(enrichedParams, baseReplacements, scopeWhereVenta, 'categoria'),
            baseReplacements
        ),
        runDistinctQuery(
            'ci.id_ciudad, ci.nombre AS ciudad_nombre',
            buildBaseWhere(enrichedParams, baseReplacements, scopeWhereVenta, 'ciudad'),
            baseReplacements
        )
    ]);

    const sortByLabel = (a, b) =>
        String(a.label).localeCompare(String(b.label), 'es', { sensitivity: 'base' });

    const vendedores = vendedoresRows
        .filter((r) => r.id_vendedor != null && r.codigo_vendedor)
        .map((r) => ({
            value: String(r.codigo_vendedor),
            label: `${String(r.codigo_vendedor).trim()} - ${(r.vendedor_nombre || '').trim()}`
        }));

    const proveedores = proveedoresRows
        .map((r) => String(r.proveedor || '').trim())
        .filter(Boolean)
        .map((valor) => {
            // Buscar el nombre "limpio" del mismo row (join con pr.nombre)
            const match = proveedoresRows.find((x) => String(x.proveedor || '').trim() === valor);
            return {
                value: valor,
                label: (match?.proveedor_nombre || valor).trim()
            };
        });

    const categorias = categoriasRows
        .filter((r) => r.id_categoria != null)
        .map((r) => ({
            value: String(r.id_categoria),
            label: `${r.id_categoria} - ${(r.categoria_nombre || '').trim()}`
        }));

    const ciudades = ciudadesRows
        .filter((r) => r.id_ciudad != null)
        .map((r) => ({
            value: String(r.id_ciudad),
            label: (r.ciudad_nombre || '').trim() || 'SIN CIUDAD'
        }));

    return {
        periodo: {
            fechaInicio: params.fechaInicioFormatted,
            fechaFin: params.fechaFinFormatted
        },
        vendedores: dedupeByValue(vendedores).sort(sortByLabel),
        proveedores: dedupeByValue(proveedores).sort(sortByLabel),
        categorias: dedupeByValue(categorias).sort(sortByLabel),
        ciudades: dedupeByValue(ciudades).sort(sortByLabel)
    };
};

const dedupeByValue = (arr) => {
    const seen = new Set();
    const out = [];
    for (const item of arr) {
        if (!item || !item.value) continue;
        if (seen.has(item.value)) continue;
        seen.add(item.value);
        out.push(item);
    }
    return out;
};

module.exports = {
    getOpcionesFiltros,
    normalizeParams
};
