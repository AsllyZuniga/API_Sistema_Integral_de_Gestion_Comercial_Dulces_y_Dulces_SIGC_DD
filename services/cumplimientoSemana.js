// === FUNCIONES POR PROVEEDOR, CIUDAD, ITEM ===
// Por proveedor (líneas)
async function getLineasPorVendedor(codigoVendedor, filters = {}) {
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
    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
    }
    const proveedoresLinSem = normalizedFilters.proveedores && normalizedFilters.proveedores.length > 0
        ? normalizedFilters.proveedores
        : (normalizedFilters.proveedor ? [String(normalizedFilters.proveedor).trim()] : null);

    if (proveedoresLinSem) {
        const provCond = buildProveedorCondition(proveedoresLinSem, replacements, 'dv');
        where.push(`(${provCond})`);
    }
    if (normalizedFilters.categorias && normalizedFilters.categorias.length > 0) {
        const placeholders = normalizedFilters.categorias.map((_, i) => `:semLinCat${i}`).join(',');
        where.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
        normalizedFilters.categorias.forEach((cat, i) => { replacements[`semLinCat${i}`] = String(cat); });
    } else if (normalizedFilters.categoria) {
        const categoriaId = await getCategoriaIdByNombre(normalizedFilters.categoria);
        if (categoriaId) {
            where.push('CAST(it.id_categoria AS TEXT) = :categoria');
            replacements.categoria = String(categoriaId);
        }
    }
    const query = `
        SELECT
            COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS codigo_linea,
            COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS nombre_linea,
            COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS reporte_prov_con_obs,
            SUM(${signedNcDetailSubtotalSql('v', 'dv')}) AS venta
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
        LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
        WHERE ${where.join(' AND ')}
        GROUP BY COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA'))
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
                linea: row.reporte_prov_con_obs,
                reporteProvConObs: row.reporte_prov_con_obs,
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
    if (normalizedFilters.ciudad) {
        where.push('CAST(c.id_ciudad AS TEXT) = :ciudad');
        replacements.ciudad = String(normalizedFilters.ciudad);
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

const signedNcAmountSql = (alias) => `COALESCE(${alias}.valor_neto, ${alias}.subtotal, 0)`;
const signedNcSubtotalSql = (alias) => `COALESCE(${alias}.subtotal, 0)`;
const signedNcDetailSubtotalSql = (ventaAlias, detalleAlias) => `COALESCE(${detalleAlias}.subtotal, 0)`;

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

const buildProveedorCondition = (proveedores, replacements, detalleAlias = 'dv') => {
    if (!proveedores || proveedores.length === 0) return null;
    const clauses = proveedores.map((p, i) => {
        replacements[`semProvExacto${i}`] = p;
        replacements[`semProvLike${i}`] = `${p}%`;
        return `(TRIM(${detalleAlias}.reporte_prov_con_obs) = :semProvExacto${i} OR TRIM(${detalleAlias}.reporte_prov_con_obs) LIKE :semProvLike${i})`;
    });
    return clauses.join(' OR ');
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
        detalleJoins = `JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item it ON it.id_item = dv.id_item`;
    }

    const allConditions = [...dateConditions, ...detalleConditions];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

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
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
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
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(cs.cuota_semana, 0) > 0 OR COALESCE(vf.venta_acum, 0) != 0)
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
