/**
 * Detalle semanal de líneas (proveedores) vendidas por un vendedor.
 * Devuelve el resumen por línea y el detalle por línea.
 *
 * @param {string} codigoVendedor
 * @param {object} [filters={}] fechaInicio, fechaFin, etc.
 * @returns {Promise<{resumenPorLinea: Array, detallePorLinea: Array,
 *   periodo: object}>}
 */
// Por proveedor (líneas)
async function getLineasPorVendedor(codigoVendedor, filters = {}) {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };

    // Filtros que aplican SOLO al subquery de ventas (no afectan qué proveedores aparecen)
    const ventasWhere = ['vd.codigo_vendedor = :codigoVendedor'];
    if (normalizedFilters.fechaInicio) {
        ventasWhere.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = formatDateOnly(normalizedFilters.fechaInicio);
    }
    if (normalizedFilters.fechaFin) {
        ventasWhere.push('v.fecha <= :fechaFin');
        replacements.fechaFin = formatDateOnly(normalizedFilters.fechaFin);
    }
    const ciudadCondLinSem = buildCiudadCondition(normalizedFilters, replacements, 'c.id_ciudad');
    if (ciudadCondLinSem) {
        ventasWhere.push(ciudadCondLinSem);
    }
    const proveedoresLinSem = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    let cuotaProveedorCondLinSem = '';
    if (proveedoresLinSem) {
        const provCond = buildProveedorCondition(proveedoresLinSem, replacements, 'dv');
        ventasWhere.push(`(${provCond})`);

        const cuotaPlaceholders = proveedoresLinSem.map((_, i) => `:semCuotaProvLV${i}`).join(',');
        proveedoresLinSem.forEach((p, i) => { replacements[`semCuotaProvLV${i}`] = p; });
        cuotaProveedorCondLinSem = `AND vcp.id_proveedor IN (${cuotaPlaceholders})`;
    }
    if (normalizedFilters.categorias && normalizedFilters.categorias.length > 0) {
        const placeholders = normalizedFilters.categorias.map((_, i) => `:semLinCat${i}`).join(',');
        ventasWhere.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        normalizedFilters.categorias.forEach((cat, i) => { replacements[`semLinCat${i}`] = String(cat); });
    } else if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            ventasWhere.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(categoriaId);
        }
    }

    replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    replacements.cuotaFechaFin = normalizedFilters.fechaFin;

    // Cuota por proveedor (misma fuente que cuota mensual: cuotaProveedor +
    // vendedorCuotaProveedor), no la cuota total del vendedor repetida en
    // cada fila.
    const query = `
        WITH cuotas_vendedor AS (
            SELECT
                vcp.id_proveedor,
                COALESCE(TRIM(pr.nombre), 'SIN LINEA') AS nombre_proveedor,
                TRIM(COALESCE(pr.codigo, '')) AS codigo_proveedor,
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(COALESCE(TRIM(pr.nombre), 'SIN LINEA'), '[^a-zA-Z0-9 ]', ' ', 'g'),
                    ' +', ' ', 'g'
                ))) AS nombre_norm,
                cp.cuota AS cuota_proveedor
            FROM "vendedorCuotaProveedor" vcp
            JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
            JOIN vendedor vd ON vd.id_vendedor = vcp.id_vendedor
            LEFT JOIN proveedor pr ON pr.id_proveedor = vcp.id_proveedor
            WHERE vd.codigo_vendedor = :codigoVendedor
              AND vcp.estado = true
              AND cp.fecha_inicio <= :cuotaFechaFin
              AND cp.fecha_fin >= :cuotaFechaInicio
              ${cuotaProveedorCondLinSem}
        ),
        cuotas_deduplicadas AS (
            SELECT DISTINCT ON (nombre_norm)
                id_proveedor,
                nombre_proveedor,
                codigo_proveedor,
                nombre_norm,
                cuota_proveedor
            FROM cuotas_vendedor
            ORDER BY nombre_norm, cuota_proveedor DESC
        ),
        ventas_por_proveedor AS (
            SELECT
                MAX(TRIM(SPLIT_PART(COALESCE(TRIM(dv.reporte_prov_con_obs), ''), ' - ', 1))) AS codigo_reporte,
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', '')),
                        '[^a-zA-Z0-9 ]', ' ', 'g'
                    ),
                    ' +', ' ', 'g'
                ))) AS nombre_norm,
                MAX(TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', ''))) AS reporte_prov_con_obs,
                MAX(it.id_proveedor) AS id_proveedor,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta_total
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item
            LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            WHERE ${ventasWhere.join(' AND ')}
            GROUP BY UPPER(TRIM(REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', '')),
                            '[^a-zA-Z0-9 ]', ' ', 'g'
                        ),
                        ' +', ' ', 'g'
                    )))
        )
        -- Cuotas con sus ventas (LEFT JOIN: cuota sin venta = venta 0)
        SELECT
            COALESCE(cq.id_proveedor, vp.id_proveedor) AS id_proveedor,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS codigo_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS nombre_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS reporte_prov_con_obs,
            cq.cuota_proveedor,
            COALESCE(vp.venta_total, 0) AS venta
        FROM cuotas_deduplicadas cq
        LEFT JOIN ventas_por_proveedor vp
            ON vp.nombre_norm = cq.nombre_norm
        UNION ALL
        -- Ventas sin cuota asignada (proveedor no está en vendedorCuotaProveedor)
        SELECT
            vp.id_proveedor,
            vp.reporte_prov_con_obs AS codigo_linea,
            vp.reporte_prov_con_obs AS nombre_linea,
            vp.reporte_prov_con_obs AS reporte_prov_con_obs,
            0 AS cuota_proveedor,
            vp.venta_total AS venta
        FROM ventas_por_proveedor vp
        WHERE NOT EXISTS (
            SELECT 1 FROM cuotas_deduplicadas cq
            WHERE vp.nombre_norm = cq.nombre_norm
        )
        ORDER BY venta DESC
    `;

    const detallePorLinea = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const cuotaSemanaVendedor = await getCuotaSemanaPorVendedor(codigoVendedor, normalizedFilters);

    return {
        codigoVendedor,
        cuotaVendedor: round(cuotaSemanaVendedor, 2),
        detallePorLinea: detallePorLinea.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const cuotaProveedor = toNumber(row.cuota_proveedor);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
            const porcCumProy = cuotaProveedor > 0 ? (proyeccionVenta / cuotaProveedor) * 100 : 0;
            return {
                idProveedor: row.id_proveedor,
                codigoLinea: row.codigo_linea,
                linea: row.reporte_prov_con_obs,
                reporteProvConObs: row.reporte_prov_con_obs,
                cuotaProveedor: round(cuotaProveedor, 2),
                cuotaProveedorTotal: round(cuotaProveedor, 2),
                cuotaVendedor: round(cuotaSemanaVendedor, 2),
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4)
            };
        })
    };
}

/**
 * Detalle semanal de UNA línea (proveedor) específica para un
 * vendedor. Coincidencia flexible: código exacto, prefijo, o nombre.
 *
 * @param {string} codigoVendedor
 * @param {string} codigoLinea
 * @param {object} [filters={}] mismos filtros que getLineasPorVendedor
 * @returns {Promise<{codigoVendedor: string, codigoLinea: string,
 *   detallePorLinea: Array}>}
 */
// Por proveedor específico
async function getLineaEspecificaPorVendedor(codigoVendedor, codigoLinea, filters = {}) {
    const data = await getLineasPorVendedor(codigoVendedor, filters);
    const codigoLineaNormalizado = String(codigoLinea || '').trim();
    const detalle = data.detallePorLinea.filter((row) => {
        const codigoTexto = String(row.codigoLinea || '').trim();
        const lineaTexto = String(row.linea || '');
        return (
            codigoTexto === codigoLineaNormalizado
            || codigoTexto.startsWith(codigoLineaNormalizado)
            || lineaTexto.toLowerCase().includes(codigoLineaNormalizado.toLowerCase())
        );
    });
    return {
        codigoVendedor,
        codigoLinea: codigoLineaNormalizado,
        detallePorLinea: detalle
    };
}

/**
 * Distribución semanal de ventas por ciudad de un vendedor.
 *
 * @param {string} codigoVendedor
 * @param {object} [filters={}] fechaInicio, fechaFin, etc.
 * @returns {Promise<{detallePorCiudad: Array,
 *   resumen: {totalVenta: number, ciudadesCount: number},
 *   periodo: object}>}
 */
// Por ciudad
async function getCiudadesPorVendedor(codigoVendedor, filters = {}) {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];
    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = formatDateOnly(normalizedFilters.fechaInicio);
    }
    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = formatDateOnly(normalizedFilters.fechaFin);
    }
    const proveedoresCiudSem = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    const categoriasCiudSem = normalizedFilters.categorias && normalizedFilters.categorias.length > 0
        ? normalizedFilters.categorias
        : null;

    if (proveedoresCiudSem || categoriasCiudSem || normalizedFilters.categoria) {
        const sub = [];
        if (proveedoresCiudSem) {
            const provCond = buildProveedorCondition(proveedoresCiudSem, replacements, 'dv');
            sub.push(`(${provCond})`);
        }
        if (categoriasCiudSem) {
            const placeholders = categoriasCiudSem.map((_, i) => `:semCiudCat${i}`).join(',');
            sub.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
            categoriasCiudSem.forEach((cat, i) => { replacements[`semCiudCat${i}`] = String(cat); });
        } else if (normalizedFilters.categoria) {
            const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
            if (categoriaId) {
                sub.push('CAST(it.id_categoria AS TEXT) = :categoria');
                replacements.categoria = String(categoriaId);
            }
        }
        where.push(`
            EXISTS (
                SELECT 1
                FROM detalle_venta dv
                JOIN item it ON it.id_item = dv.id_item
                WHERE dv.id_venta = v.id_venta
                  AND ${sub.join(' AND ')}
            )
        `);
    }
    const ciudadCondCiudSem = buildCiudadCondition(normalizedFilters, replacements, 'c.id_ciudad');
    if (ciudadCondCiudSem) {
        where.push(ciudadCondCiudSem);
    }
    let ciudadSelect = 'COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\') AS ciudad';
    let ciudadGroup = 'COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\')';
    if (ciudadCondCiudSem) {
        ciudadSelect = 'TRIM(ci.nombre) AS ciudad';
        ciudadGroup = 'TRIM(ci.nombre)';
    }
    const query = `
        SELECT
                ${ciudadSelect},
            SUM(${signedNcAmountSql('v')}) AS venta
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        LEFT JOIN ciudad ci ON ci.id_ciudad = c.id_ciudad
        WHERE ${where.join(' AND ')}
        GROUP BY ${ciudadGroup}
        ORDER BY venta DESC
    `;
    const detallePorCiudad = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const cuotaSemana = await getCuotaSemanaPorVendedor(codigoVendedor, normalizedFilters);
    return {
        codigoVendedor,
        detallePorCiudad: detallePorCiudad.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaSemana > 0 ? (ventaAcum / cuotaSemana) * 100 : 0;
            const porcCumProy = cuotaSemana > 0 ? (proyeccionVenta / cuotaSemana) * 100 : 0;
            return {
                ciudad: row.ciudad,
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4)
            };
        })
    };
}

/**
 * Listado semanal de productos (items) vendidos por un vendedor.
 *
 * @param {string} codigoVendedor
 * @param {object} [filters={}] fechaInicio, fechaFin, etc.
 * @returns {Promise<{detalle: Array<{Codigo: string, Descripcion: string,
 *   Cantidad: number, Subtotal: number}>, periodo: object}>}
 */
// Por producto/item
async function getProductosPorVendedor(codigoVendedor, filters = {}) {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];
    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = formatDateOnly(normalizedFilters.fechaInicio);
    }
    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = formatDateOnly(normalizedFilters.fechaFin);
    }
    const ciudadCondProdSem = buildCiudadCondition(normalizedFilters, replacements, 'c.id_ciudad');
    if (ciudadCondProdSem) {
        where.push(ciudadCondProdSem);
    }
    const proveedoresProdSem = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    if (proveedoresProdSem) {
        const provCond = buildProveedorCondition(proveedoresProdSem, replacements, 'dv');
        where.push(`(${provCond})`);
    }
    if (normalizedFilters.categorias && normalizedFilters.categorias.length > 0) {
        const placeholders = normalizedFilters.categorias.map((_, i) => `:semProdCat${i}`).join(',');
        where.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        normalizedFilters.categorias.forEach((cat, i) => { replacements[`semProdCat${i}`] = String(cat); });
    } else if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            where.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(categoriaId);
        }
    }
    const query = `
        SELECT
            MIN(v.fecha) AS "Fecha",
            COALESCE(TRIM(pr.nombre), 'SIN PROVEEDOR') AS "Proveedor",
            it.codigo_item AS "Cod_Item",
            TRIM(it.descripcion) AS "Descripcion",
            SUM(COALESCE(dv.cantidad_emp, 0)) AS "Venta_Unid_Cajas",
            SUM(COALESCE(dv.cantidad, 0)) AS "Cantidad",
            SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS "Subtotal"
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        WHERE ${where.join(' AND ')}
        GROUP BY COALESCE(TRIM(pr.nombre), 'SIN PROVEEDOR'), it.codigo_item, TRIM(it.descripcion)
        ORDER BY "Subtotal" DESC
    `;
    const detallePorProducto = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
    return {
        codigoVendedor,
        detallePorProducto: detallePorProducto.map((row) => ({
            Fecha: row.Fecha,
            Proveedor: row.Proveedor,
            Cod_Item: row.Cod_Item,
            Descripcion: row.Descripcion,
            Venta_Unid_Cajas: round(toNumber(row.Venta_Unid_Cajas), 2),
            Cantidad: round(toNumber(row.Cantidad), 2),
            Subtotal: round(toNumber(row.Subtotal), 2)
        }))
    };
}

// Utilidad: obtener cuota semana por vendedor
async function getCuotaSemanaPorVendedor(codigoVendedor, filters = {}) {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor: String(codigoVendedor || '').trim() };
    const conditions = ['cs.id_usuario = vd.id_usuario'];
    if (normalizedFilters.fechaInicio) {
        conditions.push('cs.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        conditions.push('cs.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
    }
    const row = await sequelize.query(`
        SELECT COALESCE(cs.cuota_semana, 0) AS cuota_semana
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cs.cuota_semana
            FROM "cuotaSemana" cs
            WHERE ${conditions.join(' AND ')}
            ORDER BY cs.fecha_fin DESC NULLS LAST, cs."id_cuotaSemana" DESC
            LIMIT 1
        ) cs ON true
        WHERE vd.codigo_vendedor = :codigoVendedor
        LIMIT 1
    `, {
        replacements,
        type: QueryTypes.SELECT,
        plain: true
    });
    return toNumber(row?.cuota_semana);
}
const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getVendedorScopeFromAuth, buildScopeWhere, buildScopeWhereVenta } = require('../utils/scopeHelper');

const getCategoriaIdByNombre = async (nombreCategoria) => {
    if (!nombreCategoria) return null;
    const nombre = String(nombreCategoria).trim();
    const row = await sequelize.query(`
        SELECT id_categoria
        FROM categoria
        WHERE TRIM(nombre) = :nombre
        LIMIT 1
    `, {
        replacements: { nombre },
        type: QueryTypes.SELECT,
        plain: true
    });
    return row?.id_categoria;
};

// Nota: estas 3 funciones no restaban notas crédito pese al nombre
// "signed" (a diferencia de sus equivalentes en cumplimientoMesService.js,
// que sí aplican CASE WHEN NC THEN -ABS(...)). Esto inflaba los totales
// semanales en cualquier rango con notas crédito. Se alinean con el
// patrón ya usado en getCumplimientoSemanaFront (líneas 668-671).
const signedNcAmountSql = (alias) => `CASE WHEN UPPER(TRIM(${alias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${alias}.valor_neto, ${alias}.subtotal, 0)) ELSE COALESCE(${alias}.valor_neto, ${alias}.subtotal, 0) END`;
const signedNcSubtotalSql = (alias) => `CASE WHEN UPPER(TRIM(${alias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${alias}.subtotal, 0)) ELSE COALESCE(${alias}.subtotal, 0) END`;
const signedNcDetailSubtotalSql = (ventaAlias, detalleAlias) => `CASE WHEN UPPER(TRIM(${ventaAlias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${detalleAlias}.subtotal, 0)) ELSE COALESCE(${detalleAlias}.subtotal, 0) END`;

const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};
const toNumber = (value) => Number(value || 0);
const toDateOnly = (value) => {
    if (!value) {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};
const formatDateOnly = (date) => {
    const localDate = toDateOnly(date);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizePeriodFilters = (filters = {}) => {
    if (filters.fechaInicio && filters.fechaFin) {
        const startDate = toDateOnly(filters.fechaInicio);
        const endDate = toDateOnly(filters.fechaFin);
        return {
            ...filters,
            fechaInicio: startDate,
            fechaFin: endDate
        };
    }
    const baseDate = filters.fechaInicio
        ? toDateOnly(filters.fechaInicio)
        : (filters.fechaFin ? toDateOnly(filters.fechaFin) : new Date());
    const now = new Date(baseDate);
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        ...filters,
        fechaInicio: monday,
        fechaFin: sunday
    };
};

const getRangoDias = async (filters = {}) => {
    const where = {};
    if (filters.fechaInicio && filters.fechaFin) {
        where.fecha_inicio = { [Op.lte]: filters.fechaFin };
        where.fecha_fin = { [Op.gte]: filters.fechaInicio };
    } else {
        const today = new Date().toISOString().slice(0, 10);
        where.fecha_inicio = { [Op.lte]: today };
        where.fecha_fin = { [Op.gte]: today };
    }
    const rango = await rango_dias_model.findOne({ where, order: [['fecha_fin', 'DESC']] });
    if (!rango) {
        // fallback: todos los días corridos y hábiles entre fechas
        const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');
        const resumen = getResumenPeriodoLaboral({
            fechaInicio: filters.fechaInicio,
            fechaFin: filters.fechaFin,
            fechaCorte: new Date()
        });
        return {
            diasCorridos: toNumber(resumen.dias_corridos),
            diasHabiles: toNumber(resumen.dias_habiles)
        };
    }
    return {
        diasCorridos: toNumber(rango?.dias_corridos),
        diasHabiles: toNumber(rango?.dias_habiles)
    };
};

const buildProveedorCondition = (proveedores, replacements) => {
    if (!proveedores || proveedores.length === 0) return null;
    const placeholders = proveedores.map((_, i) => `:fProv${i}`).join(',');
    proveedores.forEach((p, i) => { replacements[`fProv${i}`] = p; });
    const codigoReporte = `TRIM(REPLACE(TRIM(SPLIT_PART(COALESCE(TRIM(dv.reporte_prov_con_obs), ''), ' - ', 1)), '"', ''))`;
    return `(
        ${codigoReporte} IN (${placeholders})
        OR ${codigoReporte} IN (
            SELECT DISTINCT TRIM(REPLACE(TRIM(codigo), '"', ''))
            FROM proveedor
            WHERE CAST(id_proveedor AS TEXT) IN (${placeholders})
        )
    )`;
};

let ciudadCondPrefixCounter = 0;
const buildCiudadCondition = (filters, replacements, columnSql = 'c.id_ciudad') => {
    const ciudades = filters.ciudades && filters.ciudades.length > 0
        ? filters.ciudades
        : (filters.ciudad ? [String(filters.ciudad).trim()] : []);
    if (!ciudades.length) return null;
    const prefix = `semCiu${ciudadCondPrefixCounter++}_`;
    const placeholders = ciudades.map((_, i) => `:${prefix}${i}`).join(',');
    ciudades.forEach((c, i) => { replacements[`${prefix}${i}`] = String(c); });
    return `CAST(${columnSql} AS TEXT) IN (${placeholders})`;
};

const buildVentasFilters = (filters = {}, replacements = {}) => {
    const conditions = [];

    if (filters.fechaInicio) {
        conditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        conditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = filters.fechaFin;
    }

    if (filters.ciudad) {
        conditions.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(filters.ciudad);
    }

    const proveedores = filters.proveedores && filters.proveedores.length > 0
        ? filters.proveedores
        : (filters.proveedor ? [String(filters.proveedor).trim()] : null);

    if (proveedores) {
        const provCond = buildProveedorCondition(proveedores, replacements);
        conditions.push(`
            EXISTS (
                SELECT 1
                FROM detalle_venta dv
                JOIN item it ON it.id_item = dv.id_item
                WHERE dv.id_venta = v.id_venta
                  AND (${provCond})
            )
        `);
    }

    if (filters.categorias && filters.categorias.length > 0) {
        const placeholders = filters.categorias.map((_, index) => `:semCat${index}`).join(',');
        conditions.push(`
            EXISTS (
                SELECT 1
                FROM detalle_venta dv
                JOIN item it ON it.id_item = dv.id_item
                WHERE dv.id_venta = v.id_venta
                  AND CAST(it.id_categoria AS TEXT) IN (${placeholders})
            )
        `);
        filters.categorias.forEach((cat, index) => {
            replacements[`semCat${index}`] = String(cat);
        });
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
};

const toArr = (val) => {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap((v) => String(v).split(',').map((s) => s.trim())).filter(Boolean);
    return [...new Set(flat)];
};

const buildVendedorFilter = (filters = {}, replacements = {}) => {
    const vendedores = filters.vendedores && filters.vendedores.length > 0
        ? filters.vendedores
        : toArr(filters.vendedor);
    if (!vendedores.length) return '';

    const clauses = vendedores.map((v, i) => {
        replacements[`semVend${i}`] = String(v);
        replacements[`semVendLike${i}`] = `%${String(v).toLowerCase()}%`;
        return `(
            CAST(vd.id_vendedor AS TEXT) = :semVend${i}
            OR vd.codigo_vendedor = :semVend${i}
            OR LOWER(vd.nombre) LIKE :semVendLike${i}
        )`;
    });

    return `AND (${clauses.join(' OR ')})`;
};

const enrichCumplimiento = (rows, diasCorridos, diasHabiles) => {
    return rows.map((row) => {
        const cuotaSemana = toNumber(row.cuota_semana);
        const ventaAcum = toNumber(row.venta_acum);
        const totalNC = toNumber(row.total_nc);
        const cuotaProveedor = toNumber(row.cuota_proveedor);
        const cuotaDiaria = diasHabiles > 0 ? cuotaSemana / diasHabiles : 0;
        const porcentajeCumplimiento = cuotaSemana > 0 ? (ventaAcum / cuotaSemana) * 100 : 0;
        const porcentajeCumplimientoProveedor = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
        const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
        const porcentajeCumplimientoProyectado = cuotaSemana > 0 ? (proyeccionVenta / cuotaSemana) * 100 : 0;
        const porcentajeCumplimientoProveedorProy = cuotaProveedor > 0 ? (proyeccionVenta / cuotaProveedor) * 100 : 0;
        return {
            codVendedor: row.cod,
            nombre: row.vendedor,
            cuotaSemana: round(cuotaSemana, 2),
            cuotaProveedor: round(cuotaProveedor, 2),
            cuotaDiaria: round(cuotaDiaria, 2),
            ventaAcum: round(ventaAcum, 2),
            totalNC: round(totalNC, 2),
            porcCump: round(porcentajeCumplimiento, 2),
            porcCumpProveedor: round(porcentajeCumplimientoProveedor, 2),
            proyeccionVenta: round(proyeccionVenta, 2),
            porcCumProy: round(porcentajeCumplimientoProyectado, 2),
            porcCumProyProveedor: round(porcentajeCumplimientoProveedorProy, 2),
            dias_corridos: diasCorridos,
            dias_habiles: diasHabiles
        };
    });
};

const addTotalsRow = (rows, diasCorridos, diasHabiles) => {
    const totalCuota = rows.reduce((acc, row) => acc + toNumber(row.cuotaSemana), 0);
    const totalVenta = rows.reduce((acc, row) => acc + toNumber(row.ventaAcum), 0);
    const totalCumplimiento = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const totalProyeccion = diasCorridos > 0 ? (totalVenta / diasCorridos) * diasHabiles : 0;
    const totalCumplimientoProyectado = totalCuota > 0 ? (totalProyeccion / totalCuota) * 100 : 0;
    return [
        ...rows,
        {
            codVendedor: 'TOTALES',
            nombre: 'TOTALES',
            cuotaSemana: round(totalCuota, 2),
            cuotaDiaria: null,
            ventaAcum: round(totalVenta, 2),
            porcCump: round(totalCumplimiento, 2),
            proyeccionVenta: round(totalProyeccion, 2),
            porcCumProy: round(totalCumplimientoProyectado, 2),
            dias_corridos: diasCorridos,
            dias_habiles: diasHabiles
        }
    ];
};

/**
 * Cumplimiento semanal general para admins/supervisores: una fila
 * por vendedor con su cuota de la semana, venta acumulada,
 * porcentaje de cumplimiento, proyección y totales.
 *
 * @param {object} [filters={}] fechaInicio, fechaFin, ciudad, etc.
 * @returns {Promise<{detalle: Array, totales: object,
 *   periodo: {fechaInicio: string, fechaFin: string}}>}
 */
// General para admins/supervisores
const getCumplimientoSemanaFront = async (filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};
    const vendedorFilter = buildVendedorFilter(normalizedFilters, replacements);

    // Agregar condiciones de fecha y ciudad
    const dateConditions = [];
    if (normalizedFilters.fechaInicio) {
        dateConditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        dateConditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }
    const ciudadesFront = normalizedFilters.ciudades && normalizedFilters.ciudades.length > 0
        ? normalizedFilters.ciudades
        : (normalizedFilters.ciudad ? [String(normalizedFilters.ciudad).trim()] : null);
    if (ciudadesFront && ciudadesFront.length > 0) {
        const placeholders = ciudadesFront.map((_, i) => `:semFrontCiudad${i}`).join(',');
        dateConditions.push(`CAST(dv.id_ciudad_original AS TEXT) IN (${placeholders})`);
        ciudadesFront.forEach((c, i) => { replacements[`semFrontCiudad${i}`] = String(c); });
    }

    const proveedoresFront = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    const detalleConditions = [];
    if (proveedoresFront) {
        const provCond = buildProveedorCondition(proveedoresFront, replacements);
        detalleConditions.push(`(${provCond})`);
    }

    if (normalizedFilters.categorias && normalizedFilters.categorias.length > 0) {
        const placeholders = normalizedFilters.categorias.map((_, i) => `:semFrontCat${i}`).join(',');
        detalleConditions.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        normalizedFilters.categorias.forEach((cat, i) => { replacements[`semFrontCat${i}`] = String(cat); });
    } else if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            detalleConditions.push(`CAST(it.id_categoria AS TEXT) = :categoria`);
            replacements.categoria = String(categoriaId);
        }
    }

    let detalleJoins = '';
    if (detalleConditions.length > 0) {
        detalleJoins = `JOIN item it ON it.id_item = dv.id_item`;
    }

    const allConditions = [...dateConditions, ...detalleConditions];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

    // Si hay ciudad, proveedor o categoría seleccionados, el universo de
    // ventas se reduce: solo deben listarse vendedores con venta real bajo
    // esos filtros, no todos los que tengan cuota asignada esta semana.
    const hayFiltroReductor = Boolean(
        (ciudadesFront && ciudadesFront.length > 0) || detalleConditions.length > 0,
    );

    const cuotaConditions = ['cs.id_usuario = vd.id_usuario'];
    if (normalizedFilters.fechaInicio) {
        cuotaConditions.push('cs.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        cuotaConditions.push('cs.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
    }

    const cuotaProveedorJoin = '';
    const cuotaProveedorSelect = 'NULL AS cuota_proveedor';
    
    // Usar misma lógica que cumplimientoMes: sumar desde dv.subtotal (detalle_venta)
    const query = `
        WITH ventas_filtradas AS (
            SELECT
                v.id_vendedor,
                SUM(
                    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
                    THEN -ABS(COALESCE(dv.subtotal, 0)) 
                    ELSE COALESCE(dv.subtotal, 0) 
                    END
                ) AS venta_acum
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            ${detalleJoins}
            ${whereClause}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.id_vendedor,
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cs.cuota_semana, 0) AS cuota_semana,
            NULL AS cuota_proveedor,
            COALESCE(vf.venta_acum, 0) AS venta_acum,
            0 AS total_nc
        FROM "vendedor" vd
        LEFT JOIN LATERAL (
            SELECT SUM(cuota) AS cuota_semana
            FROM (
                SELECT cs.cuota_semana AS cuota,
                       ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM cs.fecha_inicio), EXTRACT(MONTH FROM cs.fecha_inicio) ORDER BY cs.fecha_fin DESC) AS rn
                FROM "cuotaSemana" cs
                WHERE cs.id_usuario = vd.id_usuario
                  AND cs.fecha_fin >= :cuotaFechaInicio
                  AND cs.fecha_fin <= :cuotaFechaFin
            ) cs_ranked
            WHERE cs_ranked.rn = 1
        ) cs ON true
        ${hayFiltroReductor ? 'JOIN' : 'LEFT JOIN'} ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (${hayFiltroReductor ? 'COALESCE(vf.venta_acum, 0) != 0' : '(COALESCE(cs.cuota_semana, 0) > 0 OR COALESCE(vf.venta_acum, 0) != 0)'})
        ${vendedorFilter}
        ORDER BY vd.nombre ASC
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const detalle = enrichCumplimiento(rows, diasCorridos, diasHabiles);
    return {
        periodo: {
            fechaInicio: normalizedFilters.fechaInicio,
            fechaFin: normalizedFilters.fechaFin
        },
        detalle: addTotalsRow(detalle, diasCorridos, diasHabiles)
    };
};


// Individual por vendedor
/**
 * Cumplimiento semanal de UN vendedor identificado por código.
 * Atajo sobre `getCumplimientoSemanaFront` que filtra el detalle por
 * `codVendedor`.
 *
 * @param {string} codigo codigo_vendedor
 * @param {object} [filters={}] mismos filtros que getCumplimientoSemanaFront
 * @returns {Promise<object|null>}
 */
async function getCumplimientoSemanaPorCodigo(codigo, filters = {}) {
    const data = await getCumplimientoSemanaFront({ ...filters, vendedor: codigo, vendedores: [codigo] });
    const codigoNormalizado = String(codigo || '').trim();
    return data.detalle.find((row) => String(row.codVendedor || '').trim() === codigoNormalizado) || null;
}

/**
 * Detalle semanal de líneas (proveedores) consolidado y role-aware desde JWT.
 * Mismo formato que `getLineasGeneral` del servicio mensual, pero con la
 * cuota de proveedor consultada desde `vendedorCuotaProveedor` filtrada
 * por el scope (admin: todos; supervisor: su equipo; vendedor: solo él).
 *
 * Issue #2: el supervisor antes hacía N+1 per-vendor y no veía nada
 * porque algunos vendors no tenían cuota. Ahora hace 1 sola llamada.
 *
 * @param {object} [filters={}] fechaInicio, fechaFin, proveedores, etc.
 * @param {{idUsuario?: number, idVendedor?: number, rol?: number|string} | null} [auth=null]
 * @returns {Promise<{periodo: object, detallePorLinea: Array}>}
 */
const getLineasGeneralSemana = async (filters = {}, auth = null) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};
    const ventasWhere = [];

    const scope = await getVendedorScopeFromAuth(auth);
    const scopeWhereCuota = buildScopeWhere(scope, 'vcp.id_vendedor', replacements);
    const scopeWhereVenta = buildScopeWhereVenta(scope, 'v.id_vendedor', replacements);

    if (normalizedFilters.fechaInicio) {
        ventasWhere.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = formatDateOnly(normalizedFilters.fechaInicio);
    }
    if (normalizedFilters.fechaFin) {
        ventasWhere.push('v.fecha <= :fechaFin');
        replacements.fechaFin = formatDateOnly(normalizedFilters.fechaFin);
    }
    const ciudadesGeneral = normalizedFilters.ciudades && normalizedFilters.ciudades.length > 0
        ? normalizedFilters.ciudades
        : (normalizedFilters.ciudad ? [String(normalizedFilters.ciudad).trim()] : null);
    if (ciudadesGeneral && ciudadesGeneral.length > 0) {
        const placeholders = ciudadesGeneral.map((_, i) => `:semLineasCiudad${i}`).join(',');
        ventasWhere.push(`CAST(dv.id_ciudad_original AS TEXT) IN (${placeholders})`);
        ciudadesGeneral.forEach((c, i) => { replacements[`semLineasCiudad${i}`] = String(c); });
    }

    // Filtro por vendedor (soporta array multi o string legacy)
    const vendedoresGeneral = normalizedFilters.vendedores && normalizedFilters.vendedores.length > 0
        ? normalizedFilters.vendedores.map((v) => String(v).trim()).filter(Boolean)
        : (normalizedFilters.vendedor
            ? String(normalizedFilters.vendedor).split(',').map((v) => v.trim()).filter(Boolean)
            : null);

    let vendedorCuotaCond = '';
    if (vendedoresGeneral && vendedoresGeneral.length > 0) {
        const placeholders = vendedoresGeneral.map((_, i) => `:semLineasVendedor${i}`).join(',');
        vendedoresGeneral.forEach((v, i) => { replacements[`semLineasVendedor${i}`] = v; });
        ventasWhere.push(`vd.codigo_vendedor IN (${placeholders})`);

        // La cuota (cuotas_agregadas) debe filtrarse por el mismo vendedor
        // seleccionado, igual que la venta; si no, la cuota queda calculada
        // sobre todos los vendedores del scope (bug: cuota de "todos" con
        // venta de "uno solo").
        const cuotaVendPlaceholders = vendedoresGeneral.map((_, i) => `:semCuotaVend${i}`).join(',');
        vendedoresGeneral.forEach((v, i) => { replacements[`semCuotaVend${i}`] = v; });
        vendedorCuotaCond = `
              AND vcp.id_vendedor IN (
                  SELECT id_vendedor FROM vendedor WHERE codigo_vendedor IN (${cuotaVendPlaceholders})
              )`;
    }

    const proveedoresGeneral = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    let cuotaProveedorCond = '';
    if (proveedoresGeneral) {
        const provCond = buildProveedorCondition(proveedoresGeneral, replacements);
        ventasWhere.push(`(${provCond})`);

        const cuotaPlaceholders = proveedoresGeneral.map((_, i) => `:cuotaProv${i}`).join(',');
        proveedoresGeneral.forEach((p, i) => { replacements[`cuotaProv${i}`] = p; });
        cuotaProveedorCond = `AND vcp.id_proveedor IN (${cuotaPlaceholders})`;
    }

    // Filtro por categoría (soporta array multi o string legacy). Solo
    // aplica al lado de ventas (ventas_por_proveedor ya hace JOIN a item),
    // igual que en getLineasPorVendedor.
    const categoriasGeneral = normalizedFilters.categorias && normalizedFilters.categorias.length > 0
        ? normalizedFilters.categorias
        : (normalizedFilters.categoria ? [String(normalizedFilters.categoria).trim()] : null);
    if (categoriasGeneral && categoriasGeneral.length > 0) {
        const placeholders = categoriasGeneral.map((_, i) => `:semLineasCat${i}`).join(',');
        ventasWhere.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        categoriasGeneral.forEach((cat, i) => { replacements[`semLineasCat${i}`] = String(cat); });
    }

    if (scopeWhereVenta) {
        ventasWhere.push(scopeWhereVenta.replace(/^\s*AND\s+/i, ''));
    }

    replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    replacements.cuotaFechaFin = normalizedFilters.fechaFin;

    const ventasWhereClause = ventasWhere.length > 0 ? `WHERE ${ventasWhere.join(' AND ')}` : '';

    // Si hay ciudad, vendedor(es) o categoría(s) seleccionados, el universo
    // de ventas se reduce: solo deben listarse proveedores con venta real
    // bajo esos filtros, no todos los que tengan cuota asignada al scope.
    const hayFiltroReductor = Boolean(
        (ciudadesGeneral && ciudadesGeneral.length > 0) ||
        (vendedoresGeneral && vendedoresGeneral.length > 0) ||
        (categoriasGeneral && categoriasGeneral.length > 0),
    );

    // Ciudad y categoría reducen implícitamente el universo de vendedores
    // (solo los que vendieron bajo esos filtros), pero no alimentan
    // vendedorCuotaCond (que solo reacciona a filtro explícito de vendedor).
    // Sin esto, cuotas_agregadas suma cuota de TODOS los vendedores del
    // scope aunque ventas_por_proveedor ya esté acotado a un subconjunto,
    // inflando cuota_proveedor_total. Si ya hay filtro explícito de
    // vendedor, vendedorCuotaCond ya restringe correctamente y esto es
    // redundante (no se aplica para evitar duplicar filtros).
    let vendedoresImplicitosCond = '';
    if (!vendedorCuotaCond && ((ciudadesGeneral && ciudadesGeneral.length > 0) || (categoriasGeneral && categoriasGeneral.length > 0))) {
        vendedoresImplicitosCond = `
              AND vcp.id_vendedor IN (
                  SELECT DISTINCT v.id_vendedor
                  FROM venta v
                  JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
                  JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                  JOIN item it ON it.id_item = dv.id_item
                  ${ventasWhereClause}
              )`;
    }

    const query = `
        WITH cuotas_agregadas AS (
            SELECT
                vcp.id_proveedor,
                COALESCE(TRIM(pr.nombre), 'SIN LINEA') AS nombre_proveedor,
                TRIM(COALESCE(pr.codigo, '')) AS codigo_proveedor,
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(COALESCE(TRIM(pr.nombre), 'SIN LINEA'), '[^a-zA-Z0-9 ]', ' ', 'g'),
                    ' +', ' ', 'g'
                ))) AS nombre_norm,
                SUM(cp.cuota) AS suma_cuota
            FROM "vendedorCuotaProveedor" vcp
            JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
            LEFT JOIN proveedor pr ON pr.id_proveedor = vcp.id_proveedor
            WHERE vcp.estado = true
              AND cp.fecha_inicio <= :cuotaFechaFin
              AND cp.fecha_fin >= :cuotaFechaInicio
              ${scopeWhereCuota}
              ${cuotaProveedorCond}
              ${vendedorCuotaCond}
              ${vendedoresImplicitosCond}
            GROUP BY vcp.id_proveedor, COALESCE(TRIM(pr.nombre), 'SIN LINEA'), TRIM(COALESCE(pr.codigo, ''))
        ),
        cuotas_deduplicadas AS (
            SELECT DISTINCT ON (nombre_norm)
                id_proveedor, nombre_proveedor, codigo_proveedor, nombre_norm, suma_cuota
            FROM cuotas_agregadas
            ORDER BY nombre_norm, suma_cuota DESC
        ),
        ventas_por_proveedor AS (
            SELECT
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', '')),
                        '[^a-zA-Z0-9 ]', ' ', 'g'
                    ),
                    ' +', ' ', 'g'
                ))) AS nombre_norm,
                MAX(TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', ''))) AS reporte_prov_con_obs,
                MAX(it.id_proveedor) AS id_proveedor,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta_total
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item
            LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
            ${ventasWhereClause}
            GROUP BY UPPER(TRIM(REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', '')),
                            '[^a-zA-Z0-9 ]', ' ', 'g'
                        ),
                        ' +', ' ', 'g'
                    )))
        )
        SELECT
            COALESCE(cq.id_proveedor, vp.id_proveedor) AS id_proveedor,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS codigo_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS nombre_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS reporte_prov_con_obs,
            cq.suma_cuota AS cuota_proveedor_total,
            COALESCE(vp.venta_total, 0) AS venta
        FROM cuotas_deduplicadas cq
        ${hayFiltroReductor ? 'JOIN' : 'LEFT JOIN'} ventas_por_proveedor vp
            ON vp.nombre_norm = cq.nombre_norm
        UNION ALL
        SELECT
            vp.id_proveedor,
            vp.reporte_prov_con_obs AS codigo_linea,
            vp.reporte_prov_con_obs AS nombre_linea,
            vp.reporte_prov_con_obs AS reporte_prov_con_obs,
            0 AS cuota_proveedor_total,
            vp.venta_total AS venta
        FROM ventas_por_proveedor vp
        WHERE NOT EXISTS (
            SELECT 1 FROM cuotas_deduplicadas cq
            WHERE vp.nombre_norm = cq.nombre_norm
        )
        ORDER BY venta DESC
    `;

    const detallePorLinea = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);

    return {
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted
        },
        detallePorLinea: detallePorLinea.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const cuotaProveedor = toNumber(row.cuota_proveedor_total);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
            const porcCumProy = cuotaProveedor > 0 ? (proyeccionVenta / cuotaProveedor) * 100 : 0;

            return {
                idProveedor: row.id_proveedor,
                codigoLinea: row.codigo_linea,
                linea: row.reporte_prov_con_obs,
                reporteProvConObs: row.reporte_prov_con_obs,
                cuotaProveedorTotal: round(cuotaProveedor, 2),
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4)
            };
        })
    };
};

/**
 * Distribución semanal de ventas por ciudad consolidado y role-aware desde JWT.
 * Mismo shape que `getCiudadesPorVendedor` (per-vendor) pero filtrado por scope:
 *   - Admin: ve todas las ciudades del sistema
 *   - Supervisor: ve las ciudades donde vendió su equipo
 *   - Vendedor: ve solo las ciudades donde él vendió
 *
 * @param {object} [filters={}] fechaInicio, fechaFin, etc.
 * @param {{idUsuario?: number, idVendedor?: number, rol?: number|string} | null} [auth=null]
 * @returns {Promise<{detallePorCiudad: Array,
 *   resumen: {totalVenta: number, ciudadesCount: number},
 *   periodo: object}>}
 */
const getCiudadesGeneralSemana = async (filters = {}, auth = null) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};
    const where = [];
    const scope = await getVendedorScopeFromAuth(auth);
    const scopeWhereVenta = buildScopeWhereVenta(scope, 'v.id_vendedor', replacements);

    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = formatDateOnly(normalizedFilters.fechaInicio);
    }
    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = formatDateOnly(normalizedFilters.fechaFin);
    }
    const ciudadCondGeneralCiu = buildCiudadCondition(normalizedFilters, replacements, 'dv.id_ciudad_original');
    if (ciudadCondGeneralCiu) {
        where.push(ciudadCondGeneralCiu);
    }

    // Filtro por vendedor(es) seleccionados en la UI — mismo patrón que
    // getCumplimientoPorCiudadGlobal (equivalente mensual en cumplimientoMesService.js).
    const vendedoresGeneralCiu = normalizedFilters.vendedores && normalizedFilters.vendedores.length > 0
        ? normalizedFilters.vendedores
        : (normalizedFilters.vendedor ? [String(normalizedFilters.vendedor).trim()] : null);
    if (vendedoresGeneralCiu && vendedoresGeneralCiu.length) {
        const placeholders = vendedoresGeneralCiu.map((_, i) => `:semCiuVend${i}`).join(',');
        vendedoresGeneralCiu.forEach((v, i) => { replacements[`semCiuVend${i}`] = v; });
        where.push(`vd.codigo_vendedor IN (${placeholders})`);
    }

    // Filtro por proveedor(es)/categoría(s) — mismo patrón que getCiudadesPorVendedor.
    const proveedoresGeneralCiu = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);
    const categoriasGeneralCiu = normalizedFilters.categorias && normalizedFilters.categorias.length > 0
        ? normalizedFilters.categorias
        : null;
    if (proveedoresGeneralCiu) {
        const provCond = buildProveedorCondition(proveedoresGeneralCiu, replacements);
        where.push(`(${provCond})`);
    }
    if (categoriasGeneralCiu) {
        const placeholders = categoriasGeneralCiu.map((_, i) => `:semCiuCat${i}`).join(',');
        where.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        categoriasGeneralCiu.forEach((cat, i) => { replacements[`semCiuCat${i}`] = String(cat); });
    } else if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            where.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(categoriaId);
        }
    }

    if (scopeWhereVenta) {
        where.push(scopeWhereVenta.replace(/^\s*AND\s+/i, ''));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // JOIN a vendedor/item solo cuando el filtro correspondiente los necesita,
    // para no alterar el plan de la query cuando no aplica (mismo criterio
    // que el resto de funciones "PorVendedor"/"General" de este archivo).
    const joinVendedorGeneralCiu = vendedoresGeneralCiu && vendedoresGeneralCiu.length
        ? 'JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor'
        : '';
    const joinItemGeneralCiu = (proveedoresGeneralCiu || categoriasGeneralCiu || normalizedFilters.categoria)
        ? 'JOIN item it ON it.id_item = dv.id_item'
        : '';

    // Nota: el JOIN a detalle_venta multiplica las filas de venta (una
    // venta con N líneas de detalle aparece N veces). Sumar el monto de
    // CABECERA (v.valor_neto/subtotal) aquí infla el total por ese fan-out
    // — hay que sumar el subtotal POR LÍNEA (dv.subtotal), igual que el
    // resto de queries de este archivo y que el equivalente mensual
    // (getCumplimientoPorCiudadGlobal en cumplimientoMesService.js).
    const query = `
        SELECT
            COALESCE(dv.id_ciudad_original, 0) AS id_ciudad,
            COALESCE(TRIM(ci.nombre), 'SIN CIUDAD') AS ciudad,
            SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta
        FROM venta v
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        LEFT JOIN ciudad ci ON ci.id_ciudad = dv.id_ciudad_original
        ${joinVendedorGeneralCiu}
        ${joinItemGeneralCiu}
        ${whereClause}
        GROUP BY dv.id_ciudad_original, COALESCE(TRIM(ci.nombre), 'SIN CIUDAD')
        ORDER BY venta DESC
    `;

    const detallePorCiudad = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const totalVenta = detallePorCiudad.reduce((sum, r) => sum + toNumber(r.venta), 0);
    const resumen = {
        totalVenta: round(totalVenta, 2),
        ciudadesCount: detallePorCiudad.length
    };

    return {
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted
        },
        resumen,
        detallePorCiudad
    };
};

module.exports = {
    getCumplimientoSemanaFront,
    getCumplimientoSemanaPorCodigo,
    getLineasPorVendedor,
    getLineaEspecificaPorVendedor,
    getCiudadesPorVendedor,
    getProductosPorVendedor,
    getLineasGeneralSemana,
    getCiudadesGeneralSemana
};
