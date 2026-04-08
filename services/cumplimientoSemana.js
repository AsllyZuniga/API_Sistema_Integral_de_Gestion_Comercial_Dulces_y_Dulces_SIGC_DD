// === FUNCIONES POR PROVEEDOR, CIUDAD, ITEM ===
// Por proveedor (líneas)
async function getLineasPorVendedor(codigoVendedor, filters = {}) {
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
        where.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(normalizedFilters.proveedor);
    }
    if (normalizedFilters.categoria) {
        where.push('CAST(it.id_categoria AS TEXT) = :categoria');
        replacements.categoria = String(normalizedFilters.categoria);
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
    const detallePorLinea = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
    const { diasCorridos, diasHabiles } = await getRangoDias(normalizedFilters);
    // Usar cuota semanal
    const cuotaSemana = await getCuotaSemanaPorVendedor(codigoVendedor, normalizedFilters);
    return {
        codigoVendedor,
        detallePorLinea: detallePorLinea.map((row) => {
            const ventaAcum = toNumber(row.venta);
            const proyeccionVenta = diasCorridos > 0 ? (ventaAcum / diasCorridos) * diasHabiles : 0;
            const porcCump = cuotaSemana > 0 ? (ventaAcum / cuotaSemana) * 100 : 0;
            const porcCumProy = cuotaSemana > 0 ? (proyeccionVenta / cuotaSemana) * 100 : 0;
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
}

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

// Por ciudad
async function getCiudadesPorVendedor(codigoVendedor, filters = {}) {
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
    if (normalizedFilters.proveedor || normalizedFilters.categoria) {
        const sub = [];
        if (normalizedFilters.proveedor) {
            sub.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
            replacements.proveedor = String(normalizedFilters.proveedor);
        }
        if (normalizedFilters.categoria) {
            sub.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(normalizedFilters.categoria);
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
    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }
    let ciudadSelect = 'COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\') AS ciudad';
    let ciudadGroup = 'COALESCE(TRIM(ci.nombre), \'SIN CIUDAD\')';
    if (normalizedFilters.ciudad) {
        ciudadSelect = 'TRIM(ci.nombre) AS ciudad';
        ciudadGroup = 'TRIM(ci.nombre)';
    }
    const query = `
        SELECT
                ${ciudadSelect},
            SUM(COALESCE(v.valor_neto, v.subtotal, 0)) AS venta
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        LEFT JOIN ciudad ci ON ci.id_ciudad = c.id_ciudad
        WHERE ${where.join(' AND ')}
        GROUP BY COALESCE(TRIM(ci.nombre), 'SIN CIUDAD')
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

// Por producto/item
async function getProductosPorVendedor(codigoVendedor, filters = {}) {
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
        where.push('CAST(it.id_proveedor AS TEXT) = :proveedor');
        replacements.proveedor = String(normalizedFilters.proveedor);
    }
    if (normalizedFilters.categoria) {
        where.push('CAST(it.id_categoria AS TEXT) = :categoria');
        replacements.categoria = String(normalizedFilters.categoria);
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
        return {
            ...filters,
            fechaInicio: formatDateOnly(toDateOnly(filters.fechaInicio)),
            fechaFin: formatDateOnly(toDateOnly(filters.fechaFin))
        };
    }
    // Por defecto, semana actual (lunes a domingo)
    const baseDate = filters.fechaInicio
        ? toDateOnly(filters.fechaInicio)
        : (filters.fechaFin ? toDateOnly(filters.fechaFin) : new Date());
    const now = new Date(baseDate);
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day; // Lunes=1, Domingo=0
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        ...filters,
        fechaInicio: formatDateOnly(monday),
        fechaFin: formatDateOnly(sunday)
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

// General para admins/supervisores
const getCumplimientoSemanaFront = async (filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};
    const ventasWhere = buildVentasFilters(normalizedFilters, replacements);
    const vendedorFilter = buildVendedorFilter(normalizedFilters, replacements);

    const cuotaConditions = ['cs.id_usuario = vd.id_usuario'];
    if (normalizedFilters.fechaInicio) {
        cuotaConditions.push('cs.fecha_fin >= :cuotaFechaInicio');
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        cuotaConditions.push('cs.fecha_inicio <= :cuotaFechaFin');
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
    }

    let cuotaProveedorJoin = '';
    let cuotaProveedorSelect = 'NULL AS cuota_proveedor';
    if (normalizedFilters.proveedor) {
        cuotaProveedorJoin = `LEFT JOIN vendedor_cuota_proveedor vcp ON vcp.id_vendedor = vd.id_vendedor AND vcp.id_proveedor = :proveedor
            LEFT JOIN "cuotaProveedor" cp ON cp.id_cuotaProveedor = vcp.id_cuotaProveedor
            AND cp.fecha_inicio <= :cuotaFechaFin AND cp.fecha_fin >= :cuotaFechaInicio`;
        cuotaProveedorSelect = 'COALESCE(cp.cuota, 0) AS cuota_proveedor';
        replacements.proveedor = String(normalizedFilters.proveedor);
        replacements.cuotaFechaFin = normalizedFilters.fechaFin;
        replacements.cuotaFechaInicio = normalizedFilters.fechaInicio;
    }
    const query = `
        WITH ventas_filtradas AS (
            SELECT
                v.id_vendedor,
                SUM(CASE WHEN v.numero_documento LIKE 'NC%' THEN COALESCE(v.valor_neto, v.subtotal, 0) ELSE COALESCE(v.valor_neto, v.subtotal, 0) END) AS venta_acum,
                SUM(CASE WHEN v.numero_documento LIKE 'NC%' THEN COALESCE(v.subtotal, 0) ELSE 0 END) AS total_nc
            FROM venta v
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ${ventasWhere}
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(cs.cuota_semana, 0) AS cuota_semana,
            ${cuotaProveedorSelect},
            COALESCE(vf.venta_acum, 0) AS venta_acum,
            COALESCE(vf.total_nc, 0) AS total_nc
        FROM vendedor vd
        LEFT JOIN LATERAL (
            SELECT cs.cuota_semana
            FROM "cuotaSemana" cs
            WHERE ${cuotaConditions.join(' AND ')}
            ORDER BY cs.fecha_fin DESC NULLS LAST, cs."id_cuotaSemana" DESC
            LIMIT 1
        ) cs ON true
        ${cuotaProveedorJoin}
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(cs.cuota_semana, 0) > 0 OR COALESCE(vf.venta_acum, 0) > 0)
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
async function getCumplimientoSemanaPorCodigo(codigo, filters = {}) {
    const data = await getCumplimientoSemanaFront({ ...filters, vendedor: codigo });
    const codigoNormalizado = String(codigo || '').trim();
    return data.detalle.find((row) => String(row.codVendedor || '').trim() === codigoNormalizado) || null;
}

module.exports = {
    getCumplimientoSemanaFront,
    getCumplimientoSemanaPorCodigo,
    getLineasPorVendedor,
    getLineaEspecificaPorVendedor,
    getCiudadesPorVendedor,
    getProductosPorVendedor
};
