const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');

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

const getMonthRange = (baseDate = new Date()) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
};

const normalizePeriodFilters = (filters = {}) => {
    if (filters.fechaInicio && filters.fechaFin) {
        const startDate = toDateOnly(filters.fechaInicio);
        const endDate = toDateOnly(filters.fechaFin);
        return {
            ...filters,
            fechaInicio: startDate,
            fechaFin: endDate,
            fechaInicioFormatted: formatDateOnly(startDate),
            fechaFinFormatted: formatDateOnly(endDate)
        };
    }

    const base = filters.fechaInicio
        ? toDateOnly(filters.fechaInicio)
        : (filters.fechaFin ? toDateOnly(filters.fechaFin) : new Date());
    const { start, end } = getMonthRange(base);

    return {
        ...filters,
        fechaInicio: start,
        fechaFin: end,
        fechaInicioFormatted: formatDateOnly(start),
        fechaFinFormatted: formatDateOnly(end)
    };
};

const calculateRangoFromPeriod = (fechaInicio, fechaFin) => {
    const resumen = getResumenPeriodoLaboral({
        fechaInicio,
        fechaFin,
        fechaCorte: new Date()
    });

    return {
        diasCorridos: toNumber(resumen.dias_corridos),
        diasHabiles: toNumber(resumen.dias_habiles)
    };
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

    // Filtro por reporteProvConObs (en lugar de id_proveedor)
    if (filters.proveedor) {
        const proveedorValue = String(filters.proveedor || '').trim();
        conditions.push(`
            EXISTS (
                SELECT 1
                FROM detalle_venta dv
                WHERE dv.id_venta = v.id_venta
                  AND (
                    TRIM(dv.reporte_prov_con_obs) = :proveedorExacto
                    OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike
                  )
            )
        `);
        replacements.proveedorExacto = proveedorValue;
        replacements.proveedorLike = `${proveedorValue}%`;
    }

    // Filtro por categorías (múltiples)
    if (filters.categorias && filters.categorias.length > 0) {
        const placeholders = filters.categorias.map((_, index) => `:categoria${index}`).join(',');
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
            replacements[`categoria${index}`] = String(cat);
        });
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
};

const buildVendedorFilter = (filters = {}, replacements = {}) => {
    if (!filters.vendedor) return '';

    replacements.vendedor = String(filters.vendedor);
    replacements.vendedorLike = `%${String(filters.vendedor).toLowerCase()}%`;

    return `
        AND (
            CAST(vd.id_vendedor AS TEXT) = :vendedor
            OR vd.codigo_vendedor = :vendedor
            OR LOWER(vd.nombre) LIKE :vendedorLike
        )
    `;
};

const signedNcAmountSql = (alias) => `CASE WHEN UPPER(TRIM(${alias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${alias}.valor_neto, ${alias}.subtotal, 0)) ELSE COALESCE(${alias}.valor_neto, ${alias}.subtotal, 0) END`;

const signedNcSubtotalSql = (alias) => `CASE WHEN UPPER(TRIM(${alias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${alias}.subtotal, 0)) ELSE COALESCE(${alias}.subtotal, 0) END`;
const signedNcDetailSubtotalSql = (ventaAlias, detalleAlias) => `CASE WHEN UPPER(TRIM(${ventaAlias}.numero_documento)) LIKE 'NC%' THEN -ABS(COALESCE(${detalleAlias}.subtotal, 0)) ELSE COALESCE(${detalleAlias}.subtotal, 0) END`;

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

    const rango = await rango_dias_model.findOne({
        where,
        order: [['fecha_fin', 'DESC']]
    });

    if (!rango) {
        if (filters.fechaInicio && filters.fechaFin) {
            return calculateRangoFromPeriod(filters.fechaInicio, filters.fechaFin);
        }

        const today = new Date();
        const { start, end } = getMonthRange(today);
        return calculateRangoFromPeriod(start, end);
    }

    return {
        diasCorridos: toNumber(rango?.dias_corridos),
        diasHabiles: toNumber(rango?.dias_habiles)
    };
};

const getCuotaMesGlobal = async (filters = {}) => {
    const replacements = {};
    const conditions = [];

    if (filters.fechaInicio) {
        conditions.push('cm.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        conditions.push('cm.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = filters.fechaFin;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const row = await sequelize.query(`
        SELECT COALESCE(cm.cuota_mes, 0) AS cuota_mes
        FROM "cuotaMes" cm
        ${where}
        ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
        LIMIT 1
    `, {
        replacements,
        type: QueryTypes.SELECT,
        plain: true
    });

    return toNumber(row?.cuota_mes);
};

const getCuotaMesPorVendedor = async (codigoVendedor, filters = {}) => {
    const replacements = {
        codigoVendedor: String(codigoVendedor || '').trim()
    };

    const conditions = ['cm.id_usuario = vd.id_usuario'];

    if (filters.fechaInicio) {
        conditions.push('cm.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        conditions.push('cm.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = filters.fechaFin;
    }

    const row = await sequelize.query(`
        SELECT COALESCE(cm.cuota_mes, 0) AS cuota_mes
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cm.cuota_mes
            FROM "cuotaMes" cm
            WHERE ${conditions.join(' AND ')}
            ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
            LIMIT 1
        ) cm ON true
        WHERE vd.codigo_vendedor = :codigoVendedor
        LIMIT 1
    `, {
        replacements,
        type: QueryTypes.SELECT,
        plain: true
    });

    return toNumber(row?.cuota_mes);
};

const enrichCumplimiento = (rows, diasCorridos, diasHabiles) => {
    return rows.map((row) => {
        const cuotaMes = toNumber(row.cuota_mes);
        const ventaAcum = toNumber(row.venta_acum);
        const totalNC = toNumber(row.total_nc);
        const cuotaProveedor = toNumber(row.cuota_proveedor);
        const porcentajeCumplimiento = cuotaMes > 0 ? (ventaAcum / cuotaMes) * 100 : 0;
        const porcentajeCumplimientoProveedor = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
        const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
        const porcentajeCumplimientoProyectado = cuotaMes > 0 ? (proyeccionVenta / cuotaMes) * 100 : 0;
        const porcentajeCumplimientoProveedorProy = cuotaProveedor > 0 ? (proyeccionVenta / cuotaProveedor) * 100 : 0;

        return {
            codVendedor: row.cod,
            nombre: row.vendedor,
            cuotaMes: round(cuotaMes, 2),
            cuotaProveedor: round(cuotaProveedor, 2),
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
    const totalCuota = rows.reduce((acc, row) => acc + toNumber(row.cuotaMes), 0);
    const totalVenta = rows.reduce((acc, row) => acc + toNumber(row.ventaAcum), 0);
    const totalCumplimiento = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const totalProyeccion = diasCorridos > 0 ? (totalVenta / diasCorridos) * diasHabiles : 0;
    const totalCumplimientoProyectado = totalCuota > 0 ? (totalProyeccion / totalCuota) * 100 : 0;

    return [
        ...rows,
        {
            codVendedor: 'TOTALES',
            nombre: 'TOTALES',
            cuotaMes: round(totalCuota, 2),
            ventaAcum: round(totalVenta, 2),
            porcCump: round(totalCumplimiento, 2),
            proyeccionVenta: round(totalProyeccion, 2),
            porcCumProy: round(totalCumplimientoProyectado, 2),
            dias_corridos: diasCorridos,
            dias_habiles: diasHabiles
        }
    ];
};

const buildTotales = (rows, diasCorridos, diasHabiles) => {
    const totalCuota = rows.reduce((acc, row) => acc + toNumber(row.cuotaMes), 0);
    const totalVenta = rows.reduce((acc, row) => acc + toNumber(row.ventaAcum), 0);
    const totalCumplimiento = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const totalProyeccion = diasCorridos > 0 ? (totalVenta / diasCorridos) * diasHabiles : 0;
    const totalCumplimientoProyectado = totalCuota > 0 ? (totalProyeccion / totalCuota) * 100 : 0;

    return {
        cuotaMes: round(totalCuota, 2),
        ventaAcum: round(totalVenta, 2),
        porcCump: round(totalCumplimiento, 2),
        proyeccionVenta: round(totalProyeccion, 2),
        porcCumProy: round(totalCumplimientoProyectado, 2),
        dias_corridos: diasCorridos,
        dias_habiles: diasHabiles
    };
};

const getCumplimientoMes = async (filters = {}) => {
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
    if (normalizedFilters.ciudad) {
        dateConditions.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }

    // Condiciones para filtros en detalle_venta
    const detalleConditions = [];
    if (normalizedFilters.proveedor) {
        const proveedorValue = String(normalizedFilters.proveedor || '').trim();
        detalleConditions.push(`(
            TRIM(dv.reporte_prov_con_obs) = :proveedorExacto
            OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike
        )`);
        replacements.proveedorExacto = proveedorValue;
        replacements.proveedorLike = `${proveedorValue}%`;
    }
    
    if (normalizedFilters.categoria) {
        detalleConditions.push(`CAST(it.id_categoria AS TEXT) = :categoria`);
        replacements.categoria = String(normalizedFilters.categoria);
    }

    // Construir JOIN adicional si hay filtros en detalle
    let detalleJoins = '';
    if (detalleConditions.length > 0) {
        detalleJoins = `JOIN item it ON it.id_item = dv.id_item`;
    }

    const detalleWhere = detalleConditions.length > 0 ? `AND ${detalleConditions.join(' AND ')}` : '';
    const dateWhere = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';

    const cuotaConditions = [];
    if (normalizedFilters.fechaInicio) {
        cuotaConditions.push('cm.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        cuotaConditions.push('cm.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
    }
    const cuotaWhere = cuotaConditions.length > 0
        ? `WHERE ${cuotaConditions.join(' AND ')}`
        : '';

    let cuotaProveedorJoin = '';
    let cuotaProveedorSelect = 'NULL AS cuota_proveedor';
    if (normalizedFilters.proveedor) {
        cuotaProveedorJoin = `LEFT JOIN vendedor_cuota_proveedor vcp ON vcp.id_vendedor = vd.id_vendedor AND vcp.id_proveedor = :cuotaProveedorId
            LEFT JOIN "cuotaProveedor" cp ON cp.id_cuotaProveedor = vcp.id_cuotaProveedor
            AND cp.fecha_inicio <= :cuotaFechaFin AND cp.fecha_fin >= :cuotaFechaInicio`;
        cuotaProveedorSelect = 'COALESCE(cp.cuota, 0) AS cuota_proveedor';
        replacements.cuotaProveedorId = String(normalizedFilters.proveedor);
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    
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
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ${whereClause}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cg.cuota_mes, 0) AS cuota_mes,
            ${cuotaProveedorSelect},
            COALESCE(vf.venta_acum, 0) AS venta_acum,
            0 AS total_nc
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cm.cuota_mes
            FROM "cuotaMes" cm
            ${cuotaWhere}
            ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
            LIMIT 1
        ) cg ON true
        ${cuotaProveedorJoin}
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(cg.cuota_mes, 0) > 0 OR COALESCE(vf.venta_acum, 0) > 0)
        ${vendedorFilter}
        ORDER BY vd.nombre ASC
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const enriched = enrichCumplimiento(rows, diasCorridos, diasHabiles);
    return addTotalsRow(enriched, diasCorridos, diasHabiles);
};

const getCumplimientoPorCodigo = async (codigo, filters = {}) => {
    const data = await getCumplimientoMesFront({ ...filters, vendedor: codigo });
    const codigoNormalizado = String(codigo || '').trim();

    return data.detalle.find((row) => String(row.codVendedor || '').trim() === codigoNormalizado) || null;
};

const getCumplimientoMesFront = async (filters = {}) => {
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
    if (normalizedFilters.ciudad) {
        dateConditions.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }

    // Condiciones para filtros en detalle_venta
    const detalleConditions = [];
    if (normalizedFilters.proveedor) {
        const proveedorValue = String(normalizedFilters.proveedor || '').trim();
        detalleConditions.push(`(
            TRIM(dv.reporte_prov_con_obs) = :proveedorExacto
            OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike
        )`);
        replacements.proveedorExacto = proveedorValue;
        replacements.proveedorLike = `${proveedorValue}%`;
    }
    
    if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            detalleConditions.push(`CAST(it.id_categoria AS TEXT) = :categoria`);
            replacements.categoria = String(categoriaId);
        }
    }

    // Construir JOIN adicional si hay filtros en detalle
    let detalleJoins = '';
    if (detalleConditions.length > 0) {
        detalleJoins = `JOIN item it ON it.id_item = dv.id_item`;
    }

    // Combinar TODAS las condiciones correctamente
    const allConditions = [...dateConditions, ...detalleConditions];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

    const cuotaConditions = ['cm.id_usuario = vd.id_usuario'];
    if (normalizedFilters.fechaInicio) {
        cuotaConditions.push('cm.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        cuotaConditions.push('cm.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
    }

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
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ${whereClause}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.id_vendedor,
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cv.cuota_mes, 0) AS cuota_mes,
            COALESCE(vf.venta_acum, 0) AS venta_acum,
            0 AS total_nc
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cm.cuota_mes
            FROM "cuotaMes" cm
            WHERE ${cuotaConditions.join(' AND ')}
              AND cm.id_usuario IS NOT NULL
            ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
            LIMIT 1
        ) cv ON true
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE vd.id_usuario IS NOT NULL
          AND (COALESCE(cv.cuota_mes, 0) > 0 OR COALESCE(vf.venta_acum, 0) > 0)
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
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted
        },
        detalle,
        totales: buildTotales(detalle, diasCorridos, diasHabiles)
    };
};

const getLineasPorVendedor = async (codigoVendedor, filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };

    // Filtros que aplican SOLO al subquery de ventas (no afectan qué proveedores aparecen)
    const ventasWhere = ['vd.codigo_vendedor = :codigoVendedor'];

    if (normalizedFilters.fechaInicio) {
        ventasWhere.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }

    if (normalizedFilters.fechaFin) {
        ventasWhere.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    if (normalizedFilters.ciudad) {
        ventasWhere.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }

    if (normalizedFilters.proveedor) {
        ventasWhere.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(normalizedFilters.proveedor);
    }

    if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            ventasWhere.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(categoriaId);
        }
    }

    replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    replacements.cuotaFechaFin = normalizedFilters.fechaFin;

    // Query base desde cuotas: incluye todos los proveedores con cuota aunque no tengan ventas.
    // JOIN por código numérico del proveedor extraído del prefijo de reporte_prov_con_obs ("020 - ARCOR" → "020").
    // Para proveedores sin código numérico, fallback por nombre normalizado.
    const query = `
        WITH cuotas_vendedor AS (
            SELECT
                vcp.id_proveedor,
                COALESCE(TRIM(pr.nombre), 'SIN LINEA') AS nombre_proveedor,
                TRIM(COALESCE(pr.codigo, '')) AS codigo_proveedor,
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(COALESCE(TRIM(pr.nombre), 'SIN LINEA'), '[^a-zA-Z0-9 ]', ' ', 'g'),
                    '\\s+', ' ', 'g'
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
                TRIM(SPLIT_PART(COALESCE(TRIM(dv.reporte_prov_con_obs), ''), ' - ', 1)) AS codigo_reporte,
                UPPER(TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        TRIM(REGEXP_REPLACE(COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')), '^[0-9]+ - ', '')),
                        '[^a-zA-Z0-9 ]', ' ', 'g'
                    ),
                    '\\s+', ' ', 'g'
                ))) AS nombre_norm,
                COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS reporte_prov_con_obs,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta_total
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item
            LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            WHERE ${ventasWhere.join(' AND ')}
            GROUP BY codigo_reporte, nombre_norm,
                     COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA'))
        )
        -- Cuotas con sus ventas (LEFT JOIN: cuota sin venta = venta 0)
        SELECT
            cq.id_proveedor,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS codigo_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS nombre_linea,
            COALESCE(vp.reporte_prov_con_obs, cq.nombre_proveedor) AS reporte_prov_con_obs,
            cq.cuota_proveedor,
            COALESCE(vp.venta_total, 0) AS venta
        FROM cuotas_deduplicadas cq
        LEFT JOIN ventas_por_proveedor vp
            ON (cq.codigo_proveedor != '' AND vp.codigo_reporte = cq.codigo_proveedor)
            OR (cq.codigo_proveedor = '' AND vp.nombre_norm = cq.nombre_norm)
        UNION ALL
        -- Ventas sin cuota asignada (proveedor no está en vendedorCuotaProveedor)
        SELECT
            NULL AS id_proveedor,
            vp.reporte_prov_con_obs AS codigo_linea,
            vp.reporte_prov_con_obs AS nombre_linea,
            vp.reporte_prov_con_obs AS reporte_prov_con_obs,
            0 AS cuota_proveedor,
            vp.venta_total AS venta
        FROM ventas_por_proveedor vp
        WHERE NOT EXISTS (
            SELECT 1 FROM cuotas_deduplicadas cq
            WHERE (cq.codigo_proveedor != '' AND vp.codigo_reporte = cq.codigo_proveedor)
               OR (cq.codigo_proveedor = '' AND vp.nombre_norm = cq.nombre_norm)
        )
        ORDER BY venta DESC
    `;

    const detallePorLinea = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const cuotaMesVendedor = await getCuotaMesPorVendedor(codigoVendedor, normalizedFilters);

    return {
        codigoVendedor,
        cuotaVendedor: round(cuotaMesVendedor, 2),
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted
        },
        detallePorLinea: detallePorLinea.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const cuotaProveedor = toNumber(row.cuota_proveedor);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
            const porcCumProy = cuotaMesVendedor > 0 ? (proyeccionVenta / cuotaMesVendedor) * 100 : 0;
            const porcCumpProveedor = cuotaProveedor > 0 ? (ventaAcum / cuotaProveedor) * 100 : 0;
            const porcCumProyProveedor = cuotaProveedor > 0 ? (proyeccionVenta / cuotaProveedor) * 100 : 0;

            return {
                idProveedor: row.id_proveedor,
                codigoLinea: row.codigo_linea,
                linea: row.reporte_prov_con_obs,
                reporteProvConObs: row.reporte_prov_con_obs,
                cuotaProveedor: round(cuotaProveedor, 2),
                cuotaVendedor: round(cuotaMesVendedor, 2),
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                porcCumpProveedor: round(porcCumpProveedor, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4),
                porcCumProyProveedor: round(porcCumProyProveedor, 4)
            };
        })
    };
};

const getLineaEspecificaPorVendedor = async (codigoVendedor, codigoLinea, filters = {}) => {
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
};

const getCiudadesPorVendedor = async (codigoVendedor, filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];

    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }

    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    let ciudadSelect = 'ci.id_ciudad AS id_ciudad, COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\') AS ciudad';
    let ciudadGroup = 'ci.id_ciudad, COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\')';
    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
        ciudadSelect = 'ci.id_ciudad AS id_ciudad, TRIM(ci.nombre) AS ciudad';
        ciudadGroup = 'ci.id_ciudad, TRIM(ci.nombre)';
    }

    // Si hay filtro de proveedor o categoría, sumar solo ventas de esos items (igual que en productos/lineas)
    let query;
    if (normalizedFilters.proveedor || normalizedFilters.categoria) {
        let extraWhere = [];
        if (normalizedFilters.proveedor) {
            const proveedorVal = String(normalizedFilters.proveedor).trim();
            extraWhere.push(`(TRIM(dv.reporte_prov_con_obs) = :proveedorExacto OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike)`);
            replacements.proveedorExacto = proveedorVal;
            replacements.proveedorLike = proveedorVal + '%';
        }
        if (normalizedFilters.categoria) {
            extraWhere.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(normalizedFilters.categoria);
        }
        const extraWhereSql = extraWhere.length > 0 ? 'AND ' + extraWhere.join(' AND ') : '';
        
        query = `
            SELECT
                COALESCE(c.id_ciudad, 0) AS id_ciudad,
                COALESCE(TRIM(ci.nombre), 'SIN CIUDAD') AS ciudad,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            LEFT JOIN ciudad ci ON ci.id_ciudad = c.id_ciudad
            WHERE ${where.join(' AND ')} ${extraWhereSql}
            GROUP BY COALESCE(c.id_ciudad, 0), COALESCE(TRIM(ci.nombre), 'SIN CIUDAD')
            ORDER BY venta DESC
        `;
    } else {
        query = `
            SELECT
                COALESCE(c.id_ciudad, 0) AS id_ciudad,
                COALESCE(TRIM(ci.nombre), 'SIN CIUDAD') AS ciudad,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            LEFT JOIN ciudad ci ON ci.id_ciudad = c.id_ciudad
            WHERE ${where.join(' AND ')}
            GROUP BY COALESCE(c.id_ciudad, 0), COALESCE(TRIM(ci.nombre), 'SIN CIUDAD')
            ORDER BY venta DESC
        `;
    }

    const detallePorCiudad = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    const cuotaMesVendedor = await getCuotaMesPorVendedor(codigoVendedor, normalizedFilters);

    return {
        codigoVendedor,
        detallePorCiudad: detallePorCiudad.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaMesVendedor > 0 ? (ventaAcum / cuotaMesVendedor) * 100 : 0;
            const porcCumProy = cuotaMesVendedor > 0 ? (proyeccionVenta / cuotaMesVendedor) * 100 : 0;

            return {
                id_ciudad: row.id_ciudad,
                ciudad: row.ciudad,
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4)
            };
        })
    };
};

const getProductosPorVendedor = async (codigoVendedor, filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];

    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }

    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }

    if (normalizedFilters.proveedor) {
        where.push('(TRIM(dv.reporte_prov_con_obs) = :proveedorExacto OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike)');
        const proveedorVal = String(normalizedFilters.proveedor).trim();
        replacements.proveedorExacto = proveedorVal;
        replacements.proveedorLike = proveedorVal + '%';
    }

    if (normalizedFilters.categoria) {
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

    const detallePorProducto = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

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
};

const getLineasGeneral = async (filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};
    const where = [];

    if (normalizedFilters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }

    if (normalizedFilters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }

    if (normalizedFilters.proveedor) {
        where.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(normalizedFilters.proveedor);
    }

    replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    replacements.cuotaFechaFin = normalizedFilters.fechaFin;

    const query = `
        WITH ventas_por_linea AS (
            SELECT
                COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS codigo_linea,
                COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS nombre_linea,
                COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS reporte_prov_con_obs,
                MAX(pr.id_proveedor) AS id_proveedor,
                SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta_total
            FROM venta v
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item
            LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            WHERE ${where.length > 0 ? where.join(' AND ') : '1=1'}
            GROUP BY COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA'))
        )
        SELECT
            vpl.id_proveedor,
            vpl.codigo_linea,
            vpl.nombre_linea,
            vpl.reporte_prov_con_obs,
            (SELECT COALESCE(SUM(cp.cuota), 0)
             FROM "vendedorCuotaProveedor" vcp
             JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
             WHERE vcp.id_proveedor = vpl.id_proveedor
               AND vcp.estado = true
               AND cp.fecha_inicio <= :cuotaFechaFin
               AND cp.fecha_fin >= :cuotaFechaInicio
            ) AS cuota_proveedor_total,
            vpl.venta_total AS venta
        FROM ventas_por_linea vpl
        ORDER BY vpl.venta_total DESC
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

module.exports = {
    getCumplimientoMes,
    getCumplimientoMesFront,
    getCumplimientoPorCodigo,
    getLineasPorVendedor,
    getLineaEspecificaPorVendedor,
    getCiudadesPorVendedor,
    getProductosPorVendedor,
    getLineasGeneral
};
