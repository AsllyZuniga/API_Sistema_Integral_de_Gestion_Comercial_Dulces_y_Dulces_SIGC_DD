const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');

const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const toNumber = (value) => Number(value || 0);

const toDateOnly = (value) => {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

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
        return {
            ...filters,
            fechaInicio: formatDateOnly(toDateOnly(filters.fechaInicio)),
            fechaFin: formatDateOnly(toDateOnly(filters.fechaFin))
        };
    }

    const base = filters.fechaInicio ? toDateOnly(filters.fechaInicio) : new Date();
    const { start, end } = getMonthRange(base);

    return {
        ...filters,
        fechaInicio: formatDateOnly(start),
        fechaFin: formatDateOnly(end)
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

    const itemConditions = [];
    if (filters.proveedor) {
        itemConditions.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(filters.proveedor);
    }

    if (filters.categoria) {
        itemConditions.push('CAST(it.id_categoria AS TEXT) = :categoria');
        replacements.categoria = String(filters.categoria);
    }

    if (itemConditions.length > 0) {
        conditions.push(`
            EXISTS (
                SELECT 1
                FROM detalle_venta dv
                JOIN item it ON it.id_item = dv.id_item
                WHERE dv.id_venta = v.id_venta
                  AND ${itemConditions.join(' AND ')}
            )
        `);
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
        const porcentajeCumplimiento = cuotaMes > 0 ? (ventaAcum / cuotaMes) * 100 : 0;
        const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
        const porcentajeCumplimientoProyectado = cuotaMes > 0 ? (proyeccionVenta / cuotaMes) * 100 : 0;

        return {
            codVendedor: row.cod,
            nombre: row.vendedor,
            cuotaMes: round(cuotaMes, 2),
            ventaAcum: round(ventaAcum, 2),
            porcCump: round(porcentajeCumplimiento, 2),
            proyeccionVenta: round(proyeccionVenta, 2),
            porcCumProy: round(porcentajeCumplimientoProyectado, 2),
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
    const replacements = {};
    const ventasWhere = buildVentasFilters(filters, replacements);
    const vendedorFilter = buildVendedorFilter(filters, replacements);

    const cuotaConditions = [];
    if (filters.fechaInicio) {
        cuotaConditions.push('cm.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = filters.fechaInicio;
    }
    if (filters.fechaFin) {
        cuotaConditions.push('cm.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = filters.fechaFin;
    }
    const cuotaWhere = cuotaConditions.length > 0
        ? `WHERE ${cuotaConditions.join(' AND ')}`
        : '';

    const query = `
        WITH ventas_filtradas AS (
            SELECT
                v.id_vendedor,
                SUM(CASE WHEN v.numero_documento LIKE 'NC%' THEN COALESCE(v.valor_neto, v.subtotal, 0) ELSE COALESCE(v.valor_neto, v.subtotal, 0) END) AS venta_acum
            FROM venta v
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ${ventasWhere}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cg.cuota_mes, 0) AS cuota_mes,
            COALESCE(vf.venta_acum, 0) AS venta_acum
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cm.cuota_mes
            FROM "cuotaMes" cm
            ${cuotaWhere}
            ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
            LIMIT 1
        ) cg ON true
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(cg.cuota_mes, 0) > 0 OR COALESCE(vf.venta_acum, 0) > 0)
        ${vendedorFilter}
        ORDER BY vd.nombre ASC
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(filters);
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
    const ventasWhere = buildVentasFilters(normalizedFilters, replacements);
    const vendedorFilter = buildVendedorFilter(normalizedFilters, replacements);

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
                SUM(CASE WHEN v.numero_documento LIKE 'NC%' THEN COALESCE(v.valor_neto, v.subtotal, 0) ELSE COALESCE(v.valor_neto, v.subtotal, 0) END) AS venta_acum
            FROM venta v
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ${ventasWhere}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cv.cuota_mes, 0) AS cuota_mes,
            COALESCE(vf.venta_acum, 0) AS venta_acum
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cm.cuota_mes
            FROM "cuotaMes" cm
            WHERE ${cuotaConditions.join(' AND ')}
            ORDER BY cm.fecha_fin DESC NULLS LAST, cm."id_cuotaMes" DESC
            LIMIT 1
        ) cv ON true
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(cv.cuota_mes, 0) > 0 OR COALESCE(vf.venta_acum, 0) > 0)
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
        detalle,
        totales: buildTotales(detalle, diasCorridos, diasHabiles)
    };
};

const getLineasPorVendedor = async (codigoVendedor, filters = {}) => {
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];

    if (filters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = filters.fechaFin;
    }

    if (filters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(filters.ciudad);
    }

    if (filters.proveedor) {
        where.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(filters.proveedor);
    }

    if (filters.categoria) {
        where.push('CAST(it.id_categoria AS TEXT) = :categoria');
        replacements.categoria = String(filters.categoria);
    }

    const query = `
        SELECT
            COALESCE(TRIM(pr.codigo), 'SIN CODIGO') AS codigo_linea,
            COALESCE(TRIM(pr.nombre), 'SIN LINEA') AS nombre_linea,
            SUM(COALESCE(dv.subtotal, 0)) AS venta
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        WHERE ${where.join(' AND ')}
        GROUP BY COALESCE(TRIM(pr.codigo), 'SIN CODIGO'), COALESCE(TRIM(pr.nombre), 'SIN LINEA')
        ORDER BY venta DESC
    `;

    const detallePorLinea = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(filters);
    const cuotaMesVendedor = await getCuotaMesPorVendedor(codigoVendedor, filters);

    return {
        codigoVendedor,
        detallePorLinea: detallePorLinea.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaMesVendedor > 0 ? (ventaAcum / cuotaMesVendedor) * 100 : 0;
            const porcCumProy = cuotaMesVendedor > 0 ? (proyeccionVenta / cuotaMesVendedor) * 100 : 0;

            return {
                codigoLinea: row.codigo_linea,
                linea: `${row.codigo_linea} - ${row.nombre_linea}`,
                ventaAcum: round(ventaAcum, 2),
                porcCump: round(porcCump, 4),
                proyeccionVenta: round(proyeccionVenta, 2),
                porcCumProy: round(porcCumProy, 4)
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
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];

    if (filters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = filters.fechaFin;
    }

    if (filters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(filters.ciudad);
    }

    if (filters.proveedor || filters.categoria) {
        const sub = [];
        if (filters.proveedor) {
            sub.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
            replacements.proveedor = String(filters.proveedor);
        }
        if (filters.categoria) {
            sub.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(filters.categoria);
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

    const query = `
        SELECT
            COALESCE(TRIM(ci.nombre), 'SIN CIUDAD') AS ciudad,
            SUM(COALESCE(v.valor_neto, v.subtotal, 0)) AS venta
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        LEFT JOIN ciudad ci ON ci.id_ciudad = c.id_ciudad
        WHERE ${where.join(' AND ')}
        GROUP BY COALESCE(TRIM(ci.nombre), 'SIN CIUDAD')
        ORDER BY venta DESC
    `;

    const detallePorCiudad = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { diasCorridos, diasHabiles } = await getRangoDias(filters);
    const cuotaMesVendedor = await getCuotaMesPorVendedor(codigoVendedor, filters);

    return {
        codigoVendedor,
        detallePorCiudad: detallePorCiudad.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaMesVendedor > 0 ? (ventaAcum / cuotaMesVendedor) * 100 : 0;
            const porcCumProy = cuotaMesVendedor > 0 ? (proyeccionVenta / cuotaMesVendedor) * 100 : 0;

            return {
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
    const replacements = { codigoVendedor };
    const where = ['vd.codigo_vendedor = :codigoVendedor'];

    if (filters.fechaInicio) {
        where.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = filters.fechaInicio;
    }

    if (filters.fechaFin) {
        where.push('v.fecha <= :fechaFin');
        replacements.fechaFin = filters.fechaFin;
    }

    if (filters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(filters.ciudad);
    }

    if (filters.proveedor) {
        where.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(filters.proveedor);
    }

    if (filters.categoria) {
        where.push('CAST(it.id_categoria AS TEXT) = :categoria');
        replacements.categoria = String(filters.categoria);
    }

    const query = `
        SELECT
            MIN(v.fecha) AS "Fecha",
            COALESCE(TRIM(pr.nombre), 'SIN PROVEEDOR') AS "Proveedor",
            it.codigo_item AS "Cod_Item",
            TRIM(it.descripcion) AS "Descripcion",
            SUM(COALESCE(dv.cantidad_emp, 0)) AS "Venta_Unid_Cajas",
            SUM(COALESCE(dv.cantidad, 0)) AS "Cantidad",
            SUM(COALESCE(dv.subtotal, 0)) AS "Subtotal"
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

module.exports = {
    getCumplimientoMes,
    getCumplimientoMesFront,
    getCumplimientoPorCodigo,
    getLineasPorVendedor,
    getLineaEspecificaPorVendedor,
    getCiudadesPorVendedor,
    getProductosPorVendedor
};
