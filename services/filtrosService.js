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

/**
 * Normaliza los query params: arrays por repetido (`?k=v1&k=v2`)
 * o comma-separated (`?k=v1,v2`). Devuelve siempre arrays limpios.
 */
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

/**
 * Construye un fragmento `<col> IN (placeholders)` cuando hay
 * valores; vacío en caso contrario. Reutiliza `replacements` para los
 * bindings. El caller se encarga de anteponer ` AND ` al unir.
 */
const buildArrayCondition = (column, values, replacements, prefix) => {
    if (!values || values.length === 0) return '';
    const placeholders = values.map((_, i) => `:${prefix}${i}`).join(',');
    values.forEach((v, i) => { replacements[`${prefix}${i}`] = v; });
    return `${column} IN (${placeholders})`;
};

/**
 * Devuelve las opciones de los 4 filtros (vendedor, proveedor,
 * categoría, ciudad) en cascada a partir de los filtros que ya
 * están aplicados.
 *
 * Reglas:
 *   - AND entre filtros distintos, OR dentro del mismo filtro.
 *   - Scope role-aware desde JWT (admin/equipo/propio).
 *   - Para vendedor: si el usuario es rol 3 se ignora el `codVendedor`
 *     del query y se fuerza su propio código.
 *   - Para ciudad se usa `detalle_venta.id_ciudad_original` (no
 *     `cliente.id_ciudad`) para ser consistente con los endpoints
 *     role-aware de ciudades.
 *   - Para proveedor se usa `detalle_venta.reporte_prov_con_obs`
 *     (que es lo que el front muestra y filtra en las tablas).
 *   - Para categoría se usa `item.id_categoria`.
 *
 * @param {object} params  query params ya normalizados
 * @param {object} auth    payload del JWT ({idUsuario, idVendedor,
 *   codVendedor, rol})
 * @returns {Promise<{vendedores: Array, proveedores: Array,
 *   categorias: Array, ciudades: Array}>}
 */
const getOpcionesFiltros = async (params, auth) => {
    const replacements = {
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin
    };

    const scope = await getVendedorScopeFromAuth(auth);
    const scopeWhereVenta = buildScopeWhereVenta(scope, 'v.id_vendedor', replacements);

    // Para rol vendedor: forzar su propio codigo_vendedor.
    let codVendedorFiltro = params.codVendedor;
    const rol = Number(auth?.rol);
    if (rol === 3) {
        const ownCode = String(auth?.codVendedor || '').trim();
        codVendedorFiltro = ownCode ? [ownCode] : [];
    }

    const conditions = ['v.fecha >= :fechaInicio', 'v.fecha <= :fechaFin'];

    if (scopeWhereVenta) {
        conditions.push(scopeWhereVenta.replace(/^\s*AND\s+/i, ''));
    }

    // Para vendedor usamos vd.codigo_vendedor (string) que es el ID
    // que se ve y se filtra en el front.
    if (codVendedorFiltro && codVendedorFiltro.length > 0) {
        const cond = buildArrayCondition(
            'vd.codigo_vendedor',
            codVendedorFiltro,
            replacements,
            'fvend'
        );
        if (cond) conditions.push(cond);
    }

    if (params.codProveedor && params.codProveedor.length > 0) {
        // Para proveedor se matchea por `dv.reporte_prov_con_obs` con
        // exacto O prefijo (mismo patrón que `buildProveedorCondition`
        // en cumplimientoMesService).
        const clauses = params.codProveedor.map((p, i) => {
            replacements[`fprovE${i}`] = p;
            replacements[`fprovL${i}`] = `${p}%`;
            return `(TRIM(dv.reporte_prov_con_obs) = :fprovE${i} OR TRIM(dv.reporte_prov_con_obs) LIKE :fprovL${i})`;
        });
        conditions.push(`(${clauses.join(' OR ')})`);
    }

    if (params.codCategoria && params.codCategoria.length > 0) {
        const cond = buildArrayCondition(
            'CAST(cat.id_categoria AS TEXT)',
            params.codCategoria,
            replacements,
            'fcat'
        );
        if (cond) conditions.push(cond);
    }

    if (params.codCiudad && params.codCiudad.length > 0) {
        const cond = buildArrayCondition(
            'CAST(dv.id_ciudad_original AS TEXT)',
            params.codCiudad,
            replacements,
            'fciu'
        );
        if (cond) conditions.push(cond);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
        SELECT DISTINCT
            vd.id_vendedor,
            vd.codigo_vendedor,
            vd.nombre AS vendedor_nombre,
            TRIM(dv.reporte_prov_con_obs) AS proveedor,
            pr.id_proveedor,
            pr.nombre AS proveedor_nombre,
            cat.id_categoria,
            cat.nombre AS categoria_nombre,
            ci.id_ciudad,
            ci.nombre AS ciudad_nombre
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        LEFT JOIN item i ON i.id_item = dv.id_item
        LEFT JOIN proveedor pr ON pr.id_proveedor = i.id_proveedor
        LEFT JOIN categoria cat ON cat.id_categoria = i.id_categoria
        LEFT JOIN ciudad ci ON ci.id_ciudad = dv.id_ciudad_original
        ${whereClause}
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    // Construcción de las 4 listas. Para vendedor, supervisor solo
    // ve a los miembros de su equipo (ya filtrado por scope JWT).
    // Para ciudad sin nombre usar 'SIN CIUDAD'. Para proveedor usar
    // `reporte_prov_con_obs` como value (lo que ve el front en la
    // tabla) y `pr.nombre` como label secundario si existe.
    const vendedorMap = new Map();
    const proveedorMap = new Map();
    const categoriaMap = new Map();
    const ciudadMap = new Map();

    rows.forEach((r) => {
        if (r.id_vendedor != null && r.codigo_vendedor) {
            const key = String(r.codigo_vendedor);
            if (!vendedorMap.has(key)) {
                vendedorMap.set(key, {
                    value: key,
                    label: `${key} - ${(r.vendedor_nombre || '').trim()}`
                });
            }
        }
        const prov = r.proveedor ? String(r.proveedor).trim() : '';
        if (prov) {
            if (!proveedorMap.has(prov)) {
                proveedorMap.set(prov, {
                    value: prov,
                    label: (r.proveedor_nombre || prov).trim()
                });
            }
        }
        if (r.id_categoria != null) {
            const key = String(r.id_categoria);
            if (!categoriaMap.has(key)) {
                categoriaMap.set(key, {
                    value: key,
                    label: `${key} - ${(r.categoria_nombre || '').trim()}`
                });
            }
        }
        if (r.id_ciudad != null) {
            const key = String(r.id_ciudad);
            if (!ciudadMap.has(key)) {
                ciudadMap.set(key, {
                    value: key,
                    label: (r.ciudad_nombre || '').trim() || 'SIN CIUDAD'
                });
            }
        }
    });

    const sortByLabel = (a, b) =>
        String(a.label).localeCompare(String(b.label), 'es', { sensitivity: 'base' });

    return {
        periodo: {
            fechaInicio: params.fechaInicioFormatted,
            fechaFin: params.fechaFinFormatted
        },
        vendedores: Array.from(vendedorMap.values()).sort(sortByLabel),
        proveedores: Array.from(proveedorMap.values()).sort(sortByLabel),
        categorias: Array.from(categoriaMap.values()).sort(sortByLabel),
        ciudades: Array.from(ciudadMap.values()).sort(sortByLabel)
    };
};

module.exports = {
    getOpcionesFiltros,
    normalizeParams
};
