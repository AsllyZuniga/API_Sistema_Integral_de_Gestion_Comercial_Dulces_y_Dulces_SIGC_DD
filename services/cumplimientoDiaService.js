const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

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
            fechaFin: endDate,
            fechaInicioFormatted: formatDateOnly(startDate),
            fechaFinFormatted: formatDateOnly(endDate)
        };
    }

    const base = filters.fechaInicio
        ? toDateOnly(filters.fechaInicio)
        : (filters.fechaFin ? toDateOnly(filters.fechaFin) : new Date());

    return {
        ...filters,
        fechaInicio: base,
        fechaFin: base,
        fechaInicioFormatted: formatDateOnly(base),
        fechaFinFormatted: formatDateOnly(base)
    };
};

const buildVendedorFilter = (filters = {}, replacements = {}) => {
    if (!filters.vendedor) return '';
    replacements.vendedor = String(filters.vendedor).trim();
    return `AND vd.codigo_vendedor = :vendedor`;
};

/**
 * Obtiene cumplimiento diario para todos los vendedores o filtrados
 * Agrupa ventas POR DÍA de todos los vendedores
 */
const getCumplimientoDiaFront = async (filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = {};

    const dateConditions = [];
    if (normalizedFilters.fechaInicio) {
        dateConditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        dateConditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    const whereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';
    const vendedorFilter = buildVendedorFilter(normalizedFilters, replacements);

    const query = `
        WITH fecha_range AS (
            SELECT CAST(:fechaInicio AS DATE) + (row_number() OVER () - 1) * INTERVAL '1 day' AS fecha
            FROM generate_series(:fechaInicio::DATE, :fechaFin::DATE, '1 day'::INTERVAL) AS t(fecha)
        ),
        ventas_diarias AS (
            SELECT
                v.fecha,
                TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha_formateada,
                SUM(
                    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
                    THEN -ABS(COALESCE(dv.subtotal, 0)) 
                    ELSE COALESCE(dv.subtotal, 0) 
                    END
                ) AS venta_acum
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            ${whereClause}
            ${vendedorFilter}
            GROUP BY v.fecha, TO_CHAR(v.fecha, 'YYYY-MM-DD')
        ),
        cuotas_diarias AS (
            SELECT
                cd.fecha_fin,
                TO_CHAR(cd.fecha_fin, 'YYYY-MM-DD') AS fecha_formateada,
                SUM(COALESCE(cd.cuota_dia, 0)) AS cuota_dia_total
            FROM "cuotaDia" cd
            WHERE cd.fecha_fin >= :fechaInicio
              AND cd.fecha_fin <= :fechaFin
            GROUP BY cd.fecha_fin, TO_CHAR(cd.fecha_fin, 'YYYY-MM-DD')
        )
        SELECT
            fr.fecha::DATE,
            TO_CHAR(fr.fecha, 'YYYY-MM-DD') AS fecha_formateada,
            TO_CHAR(fr.fecha, 'Day') AS dia_semana,
            COALESCE(vd.venta_acum, 0) AS venta_acum,
            COALESCE(cd.cuota_dia_total, 0) AS cuota_dia
        FROM fecha_range fr
        LEFT JOIN ventas_diarias vd ON vd.fecha_formateada = TO_CHAR(fr.fecha, 'YYYY-MM-DD')
        LEFT JOIN cuotas_diarias cd ON cd.fecha_formateada = TO_CHAR(fr.fecha, 'YYYY-MM-DD')
        ORDER BY fr.fecha ASC
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const detalle = rows.map((row) => {
        const ventaDiaria = toNumber(row.venta_acum);
        const cuotaDia = toNumber(row.cuota_dia);
        const porcCump = cuotaDia > 0 ? (ventaDiaria / cuotaDia) * 100 : 0;

        return {
            fecha: row.fecha_formateada,
            diaSemana: String(row.dia_semana || '').trim(),
            cuotaDia: round(cuotaDia, 2),
            ventaDiaria: round(ventaDiaria, 2),
            porcCump: round(porcCump, 2)
        };
    });

    // Calcular totales
    const totalCuota = detalle.reduce((acc, row) => acc + toNumber(row.cuotaDia), 0);
    const totalVenta = detalle.reduce((acc, row) => acc + toNumber(row.ventaDiaria), 0);
    const porcCumpTotal = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const promedioDiario = detalle.length > 0 ? totalVenta / detalle.length : 0;

    return {
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted,
            totalDias: detalle.length
        },
        detalle,
        totales: {
            cuotaDia: round(totalCuota, 2),
            totalVenta: round(totalVenta, 2),
            porcCump: round(porcCumpTotal, 2),
            promedioDiario: round(promedioDiario, 2),
            totalDias: detalle.length
        }
    };
};

/**
 * Obtiene cumplimiento diario de un vendedor específico
 */
const getCumplimientoDiaVendedor = async (codigoVendedor, filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { codigoVendedor };

    const dateConditions = ['vd.codigo_vendedor = :codigoVendedor'];
    if (normalizedFilters.fechaInicio) {
        dateConditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        dateConditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    const whereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';

    // Primero obtener el vendedor y su id_usuario
    const vendedorQuery = `
        SELECT vd.id_vendedor, vd.codigo_vendedor, vd.nombre, vd.id_usuario
        FROM vendedor vd
        WHERE vd.codigo_vendedor = :codigoVendedor
    `;

    const vendedorResult = await sequelize.query(vendedorQuery, {
        replacements,
        type: QueryTypes.SELECT
    });

    if (vendedorResult.length === 0) {
        return {
            codigoVendedor,
            nombre: '',
            periodo: {
                fechaInicio: normalizedFilters.fechaInicioFormatted,
                fechaFin: normalizedFilters.fechaFinFormatted,
                totalDias: 0
            },
            detalle: [],
            totales: {
                totalVenta: 0,
                promedioDiario: 0,
                totalDias: 0
            }
        };
    }

    const vendedor = vendedorResult[0];
    const idUsuario = vendedor.id_usuario;

    // Query que combina ventas y cuotas diarias
    const query = `
        WITH fecha_range AS (
            SELECT CAST(:fechaInicio AS DATE) + (row_number() OVER () - 1) * INTERVAL '1 day' AS fecha
            FROM generate_series(:fechaInicio::DATE, :fechaFin::DATE, '1 day'::INTERVAL) AS t(fecha)
        ),
        ventas_diarias AS (
            SELECT
                v.fecha,
                TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha_formateada,
                SUM(
                    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
                    THEN -ABS(COALESCE(dv.subtotal, 0)) 
                    ELSE COALESCE(dv.subtotal, 0) 
                    END
                ) AS venta_acum
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            WHERE vd.codigo_vendedor = :codigoVendedor
              AND v.fecha >= :fechaInicio
              AND v.fecha <= :fechaFin
            GROUP BY v.fecha, TO_CHAR(v.fecha, 'YYYY-MM-DD')
        )
        SELECT
            fr.fecha::DATE,
            TO_CHAR(fr.fecha, 'YYYY-MM-DD') AS fecha_formateada,
            TO_CHAR(fr.fecha, 'Day') AS dia_semana,
            COALESCE(vd.venta_acum, 0) AS venta_acum,
            COALESCE(cd.cuota_dia, 0) AS cuota_dia
        FROM fecha_range fr
        LEFT JOIN ventas_diarias vd ON vd.fecha_formateada = TO_CHAR(fr.fecha, 'YYYY-MM-DD')
        LEFT JOIN "cuotaDia" cd ON cd.fecha_fin = fr.fecha AND cd.id_usuario = :idUsuario
        ORDER BY fr.fecha ASC
    `;

    replacements.idUsuario = idUsuario;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const detalle = rows.map((row) => {
        const ventaDiaria = toNumber(row.venta_acum);
        const cuotaDia = toNumber(row.cuota_dia);
        const porcCump = cuotaDia > 0 ? (ventaDiaria / cuotaDia) * 100 : 0;

        return {
            fecha: row.fecha_formateada,
            diaSemana: String(row.dia_semana || '').trim(),
            cuotaDia: round(cuotaDia, 2),
            ventaDiaria: round(ventaDiaria, 2),
            porcCump: round(porcCump, 2)
        };
    });

    // Calcular totales
    const totalCuota = detalle.reduce((acc, row) => acc + toNumber(row.cuotaDia), 0);
    const totalVenta = detalle.reduce((acc, row) => acc + toNumber(row.ventaDiaria), 0);
    const porcCumpTotal = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const promedioDiario = detalle.length > 0 ? totalVenta / detalle.length : 0;

    return {
        codigoVendedor,
        nombre: vendedor.nombre,
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted,
            totalDias: detalle.length
        },
        detalle,
        totales: {
            cuotaDia: round(totalCuota, 2),
            totalVenta: round(totalVenta, 2),
            porcCump: round(porcCumpTotal, 2),
            promedioDiario: round(promedioDiario, 2),
            totalDias: detalle.length
        }
    };
};

/**
 * Obtiene cumplimiento diario para un supervisor y sus vendedores asignados
 */
const getCumplimientoDiaSupervisor = async (idSupervisor, filters = {}) => {
    const normalizedFilters = normalizePeriodFilters(filters);
    const replacements = { idSupervisor };

    const dateConditions = ['vd.id_supervisor = :idSupervisor'];
    if (normalizedFilters.fechaInicio) {
        dateConditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = normalizedFilters.fechaInicio;
    }
    if (normalizedFilters.fechaFin) {
        dateConditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = normalizedFilters.fechaFin;
    }

    const whereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';

    // Primero obtener todos los vendedores del supervisor
    const queryVendedores = `
        SELECT DISTINCT vd.id_vendedor, vd.codigo_vendedor, vd.nombre, vd.id_usuario
        FROM vendedor vd
        WHERE vd.id_supervisor = :idSupervisor
    `;

    const vendedoresAsignados = await sequelize.query(queryVendedores, {
        replacements: { idSupervisor },
        type: QueryTypes.SELECT
    });

    if (vendedoresAsignados.length === 0) {
        return {
            idSupervisor,
            vendedoresAsignados: [],
            periodo: {
                fechaInicio: normalizedFilters.fechaInicioFormatted,
                fechaFin: normalizedFilters.fechaFinFormatted,
                totalDias: 0
            },
            detalle: [],
            totales: {
                cuotaDia: 0,
                totalVenta: 0,
                porcCump: 0,
                promedioDiario: 0,
                totalDias: 0
            }
        };
    }

    // Obtener las ventas y cuotas diarias agregadas
    const query = `
        WITH fecha_range AS (
            SELECT CAST(:fechaInicio AS DATE) + (row_number() OVER () - 1) * INTERVAL '1 day' AS fecha
            FROM generate_series(:fechaInicio::DATE, :fechaFin::DATE, '1 day'::INTERVAL) AS t(fecha)
        ),
        ventas_diarias AS (
            SELECT
                v.fecha,
                TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha_formateada,
                SUM(
                    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
                    THEN -ABS(COALESCE(dv.subtotal, 0)) 
                    ELSE COALESCE(dv.subtotal, 0) 
                    END
                ) AS venta_acum
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
            ${whereClause}
            GROUP BY v.fecha, TO_CHAR(v.fecha, 'YYYY-MM-DD')
        ),
        cuotas_diarias AS (
            SELECT
                cd.fecha_fin,
                TO_CHAR(cd.fecha_fin, 'YYYY-MM-DD') AS fecha_formateada,
                SUM(COALESCE(cd.cuota_dia, 0)) AS cuota_dia_total
            FROM "cuotaDia" cd
            WHERE cd.id_usuario IN (${vendedoresAsignados.map(v => v.id_usuario).join(',')})
              AND cd.fecha_fin >= :fechaInicio
              AND cd.fecha_fin <= :fechaFin
            GROUP BY cd.fecha_fin, TO_CHAR(cd.fecha_fin, 'YYYY-MM-DD')
        )
        SELECT
            fr.fecha::DATE,
            TO_CHAR(fr.fecha, 'YYYY-MM-DD') AS fecha_formateada,
            TO_CHAR(fr.fecha, 'Day') AS dia_semana,
            COALESCE(vd.venta_acum, 0) AS venta_acum,
            COALESCE(cd.cuota_dia_total, 0) AS cuota_dia
        FROM fecha_range fr
        LEFT JOIN ventas_diarias vd ON vd.fecha_formateada = TO_CHAR(fr.fecha, 'YYYY-MM-DD')
        LEFT JOIN cuotas_diarias cd ON cd.fecha_formateada = TO_CHAR(fr.fecha, 'YYYY-MM-DD')
        ORDER BY fr.fecha ASC
    `;

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const detalle = rows.map((row) => {
        const ventaDiaria = toNumber(row.venta_acum);
        const cuotaDia = toNumber(row.cuota_dia);
        const porcCump = cuotaDia > 0 ? (ventaDiaria / cuotaDia) * 100 : 0;

        return {
            fecha: row.fecha_formateada,
            diaSemana: String(row.dia_semana || '').trim(),
            cuotaDia: round(cuotaDia, 2),
            ventaDiaria: round(ventaDiaria, 2),
            porcCump: round(porcCump, 2)
        };
    });

    // Calcular totales
    const totalCuota = detalle.reduce((acc, row) => acc + toNumber(row.cuotaDia), 0);
    const totalVenta = detalle.reduce((acc, row) => acc + toNumber(row.ventaDiaria), 0);
    const porcCumpTotal = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
    const promedioDiario = detalle.length > 0 ? totalVenta / detalle.length : 0;

    return {
        idSupervisor,
        vendedoresAsignados: vendedoresAsignados.map(v => ({
            codigo: v.codigo_vendedor,
            nombre: v.nombre
        })),
        periodo: {
            fechaInicio: normalizedFilters.fechaInicioFormatted,
            fechaFin: normalizedFilters.fechaFinFormatted,
            totalDias: detalle.length
        },
        detalle,
        totales: {
            cuotaDia: round(totalCuota, 2),
            totalVenta: round(totalVenta, 2),
            porcCump: round(porcCumpTotal, 2),
            promedioDiario: round(promedioDiario, 2),
            totalDias: detalle.length
        }
    };
};

module.exports = {
    getCumplimientoDiaFront,
    getCumplimientoDiaVendedor,
    getCumplimientoDiaSupervisor
};
