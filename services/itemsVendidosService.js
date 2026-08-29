'use strict';

const { QueryTypes, Sequelize } = require('sequelize');
const { sequelize, vendedor_model } = require('../models');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validarFechasObligatorias = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) {
        return {
            error: 'Los parámetros fechaInicio y fechaFin son obligatorios',
            code: 'FECHAS_REQUERIDAS'
        };
    }
    if (!DATE_REGEX.test(fechaInicio) || !DATE_REGEX.test(fechaFin)) {
        return {
            error: 'Formato de fecha inválido. Use YYYY-MM-DD',
            code: 'FECHA_INVALIDA'
        };
    }
    if (fechaInicio > fechaFin) {
        return {
            error: 'fechaInicio debe ser menor o igual a fechaFin',
            code: 'RANGO_FECHAS_INVALIDO'
        };
    }
    return null;
};

/**
 * Items vendidos por proveedor + item, filtrados por rol y rango de fechas.
 *
 * Roles:
 *   - 1 (admin): ve todos los items vendidos en el rango
 *   - 2 (supervisor): ve items vendidos por su equipo (vendedor.id_supervisor = idUsuario)
 *   - 3 (vendedor): ve solo los items que él vendió
 *
 * Issue #3: ya no pagina. Devuelve siempre TODAS las filas agregadas por
 * (proveedor, codigo_item) en una sola respuesta. La paginación se reservó
 * para vistas de vendedores y clientes (no para items).
 *
 * @param {object} options
 *   - fechaInicio, fechaFin (YYYY-MM-DD, obligatorios)
 *   - idRol ('1' | '2' | '3')
 *   - idUsuario, idVendedor (del token JWT)
 * @returns {Promise<{rows: Array, paginacion: object} | {error: string, code: string}>}
 */
const getItemsVendidosPorRol = async ({
    fechaInicio,
    fechaFin,
    idRol,
    idUsuario = null,
    idVendedor = null,
    // Filtros adicionales (multi-selector del front)
    codVendedor = null,
    codProveedor = null,
    codCategoria = null,
    codCiudad = null
}) => {
    const validacion = validarFechasObligatorias(fechaInicio, fechaFin);
    if (validacion) return validacion;

    const replacements = { fechaInicio, fechaFin };
    // WHERE base sobre la tabla venta. Las restricciones por rol se
    // concatenan como cláusulas AND adicionales más abajo.
    const filtrosVenta = ['v.fecha BETWEEN :fechaInicio AND :fechaFin'];

    if (idRol === '2') {
        if (!idUsuario) {
            return {
                error: 'El token no contiene idUsuario para el supervisor',
                code: 'SUPERVISOR_NO_IDENTIFICADO'
            };
        }
        const equipo = await vendedor_model.findAll({
            attributes: ['id_vendedor'],
            where: { id_supervisor: idUsuario },
            raw: true
        });
        const idsEquipo = equipo.map(v => v.id_vendedor);
        if (!idsEquipo.length) {
            return {
                rows: [],
                paginacion: { total: 0, paginado: false }
            };
        }
        // Se generan placeholders manuales (:idVend0, :idVend1, ...)
        // porque Sequelize no serializa correctamente un array JS en
        // ANY(:array) dentro de raw queries contra PostgreSQL.
        const placeholders = idsEquipo.map((_, i) => `:idVend${i}`).join(',');
        filtrosVenta.push(`v.id_vendedor IN (${placeholders})`);
        idsEquipo.forEach((id, i) => {
            replacements[`idVend${i}`] = id;
        });
    } else if (idRol === '3') {
        if (!idVendedor) {
            return {
                error: 'El token no contiene idVendedor',
                code: 'VENDEDOR_NO_IDENTIFICADO'
            };
        }
        replacements.idVendedor = idVendedor;
        filtrosVenta.push('v.id_vendedor = :idVendedor');
    } else if (idRol !== '1') {
        return { error: 'Rol no autorizado para este endpoint', code: 'ROL_NO_AUTORIZADO' };
    }

    // Filtros adicionales del usuario (multi)
    // Para vendedor: si el usuario pasó codVendedor[] se filtra por
    // codigo_vendedor (string), por lo que se hace JOIN a vendedor.
    const toArr = (val) => {
        if (val == null || val === '') return [];
        const raw = Array.isArray(val) ? val : String(val).split(',');
        const flat = raw.flatMap((v) => String(v).split(',').map((s) => s.trim())).filter(Boolean);
        return [...new Set(flat)];
    };
    const vendedoresFiltro = toArr(codVendedor);
    const proveedoresFiltro = toArr(codProveedor);
    const categoriasFiltro = toArr(codCategoria);
    const ciudadesFiltro = toArr(codCiudad);

    const joinVendedor = vendedoresFiltro.length
        ? 'JOIN vendedor vdv ON vdv.id_vendedor = v.id_vendedor'
        : '';

    if (vendedoresFiltro.length) {
        const placeholders = vendedoresFiltro.map((_, i) => `:fVend${i}`).join(',');
        vendedoresFiltro.forEach((vv, i) => { replacements[`fVend${i}`] = vv; });
        filtrosVenta.push(`vdv.codigo_vendedor IN (${placeholders})`);
    }

    if (proveedoresFiltro.length) {
        // El front envía 'codProveedor' como id_proveedor interno (del dropdown
        // de proveedores) o como código de reporte. El reporte (fuente de verdad
        // SIESA) se identifica por pm.codigo (código del REPORTE PROV CON OBS).
        // Por robustez se aceptan ambos: si llega un id, se resuelve a su(s)
        // código(s) de proveedor y se filtra por ese(s) código(s) de reporte.
        const placeholders = proveedoresFiltro.map((_, i) => `:fProv${i}`).join(',');
        proveedoresFiltro.forEach((p, i) => { replacements[`fProv${i}`] = p; });
        filtrosVenta.push(`(
            TRIM(pm.codigo) IN (${placeholders})
            OR TRIM(pm.codigo) IN (
                SELECT DISTINCT TRIM(REPLACE(codigo, '"', ''))
                FROM proveedor
                WHERE id_proveedor::text IN (${placeholders})
            )
        )`);
    }

    if (categoriasFiltro.length) {
        const placeholders = categoriasFiltro.map((_, i) => `:fCat${i}`).join(',');
        categoriasFiltro.forEach((c, i) => { replacements[`fCat${i}`] = c; });
        filtrosVenta.push(`CAST(i.id_categoria AS TEXT) IN (${placeholders})`);
    }

    if (ciudadesFiltro.length) {
        const placeholders = ciudadesFiltro.map((_, i) => `:fCiu${i}`).join(',');
        ciudadesFiltro.forEach((c, i) => { replacements[`fCiu${i}`] = c; });
        filtrosVenta.push(`CAST(dv.id_ciudad_original AS TEXT) IN (${placeholders})`);
    }

    const whereVenta = filtrosVenta.join(' AND ');

    // Código del proveedor extraído del prefijo de la línea del reporte
    // REPORTE PROV CON OBS (ej: "620 - JOHNSON Y JOHNSON" -> "620").
    // REPORTE PROV CON OBS es la fuente de verdad (SIESA); item.id_proveedor
    // (derivado de LINEA) queda descartado porque frecuentemente apunta a un
    // proveedor distinto y provoca que items/valores se atribuyan a otro
    // proveedor (no cuadra con SIESA).
    const codigoReporteExpr = `TRIM(REPLACE(TRIM(SPLIT_PART(COALESCE(dv.reporte_prov_con_obs, ''), ' - ', 1)), '"', ''))`;

    // SQL crudo (en lugar del ORM) para tener control exacto del GROUP BY.
    // Sin LIMIT/OFFSET: respuesta con TODAS las filas agregadas por
    // (proveedor, item).
    //
    // El proveedor se resuelve desde el código del REPORTE PROV CON OBS vía
    // prov_map (DISTINCT ON codigo) y se muestra el nombre resuelto; si el
    // código no existe en el maestro, se deja el texto del reporte como
    // respaldo. Con esto el subtotal de cada item se atribuye a la misma
    // línea que ve SIESA.
    const baseSelect = `
        WITH prov_map AS (
            SELECT DISTINCT ON (codigo)
                id_proveedor,
                codigo,
                TRIM(nombre) AS nombre
            FROM proveedor
            ORDER BY codigo, id_proveedor
        )
        SELECT
            COALESCE(pm.nombre, MAX(TRIM(COALESCE(dv.reporte_prov_con_obs, 'SIN LINEA')))) AS proveedor,
            TRIM(i.codigo_item) AS codigo_item,
            TRIM(i.descripcion) AS descripcion,
            COALESCE(SUM(dv.cantidad_emp), 0)::float AS unidades_cajas,
            COALESCE(SUM(dv.cantidad), 0)::float AS unidades_totales,
            COALESCE(SUM(dv.subtotal), 0)::float AS subtotal
        FROM detalle_venta dv
        INNER JOIN venta v ON v.id_venta = dv.id_venta
        INNER JOIN item i ON i.id_item = dv.id_item
        LEFT JOIN prov_map pm ON pm.codigo = ${codigoReporteExpr}
        ${joinVendedor}
        WHERE ${whereVenta}
        GROUP BY pm.nombre, i.codigo_item, i.descripcion
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM (${baseSelect}) AS sub`;
    const countRows = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT
    });
    const total = Number(countRows[0]?.total || 0);

    const rowsQuery = `${baseSelect} ORDER BY LOWER(COALESCE(pm.nombre, MAX(TRIM(COALESCE(dv.reporte_prov_con_obs, 'SIN LINEA'))))) ASC, TRIM(i.codigo_item) ASC`;

    const rows = await sequelize.query(rowsQuery, {
        replacements,
        type: QueryTypes.SELECT
    });

    return {
        // Normalización final: las columnas CHAR llegan con padding
        // residual tras el TRIM y los SUM llegan como string; se
        // garantiza el shape y los tipos esperados en la respuesta.
        rows: rows.map(r => ({
            proveedor: r.proveedor || '',
            codigo_item: r.codigo_item || '',
            descripcion: r.descripcion || '',
            unidades_cajas: Number(r.unidades_cajas || 0),
            unidades_totales: Number(r.unidades_totales || 0),
            subtotal: Number(r.subtotal || 0)
        })),
        paginacion: { total, paginado: false }
    };
};

module.exports = {
    getItemsVendidosPorRol,
    validarFechasObligatorias
};
