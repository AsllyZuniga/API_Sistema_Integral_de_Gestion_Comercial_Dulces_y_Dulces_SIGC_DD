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
        return raw.map((v) => String(v).trim()).filter(Boolean);
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
        // Match contra dv.reporte_prov_con_obs (exacto o prefijo)
        const clauses = proveedoresFiltro.map((p, i) => {
            replacements[`fProvE${i}`] = p;
            replacements[`fProvL${i}`] = `${p}%`;
            return `(TRIM(dv.reporte_prov_con_obs) = :fProvE${i} OR TRIM(dv.reporte_prov_con_obs) LIKE :fProvL${i})`;
        });
        filtrosVenta.push(`(${clauses.join(' OR ')})`);
    }

    if (categoriasFiltro.length) {
        const placeholders = categoriasFiltro.map((_, i) => `:fCat${i}`).join(',');
        categoriasFiltro.forEach((c, i) => { replacements[`fCat${i}`] = c; });
        filtrosVenta.push(`i.id_categoria IN (${placeholders})`);
    }

    if (ciudadesFiltro.length) {
        const placeholders = ciudadesFiltro.map((_, i) => `:fCiu${i}`).join(',');
        ciudadesFiltro.forEach((c, i) => { replacements[`fCiu${i}`] = c; });
        filtrosVenta.push(`dv.id_ciudad_original IN (${placeholders})`);
    }

    const whereVenta = filtrosVenta.join(' AND ');

    // SQL crudo (en lugar del ORM) para tener control exacto del
    // GROUP BY. Sin LIMIT/OFFSET: la respuesta es la lista completa
    // agregada por (proveedor, item).
    //
    // El LEFT JOIN a proveedor preserva los items sin proveedor
    // asignado (quedan con nombre vacío). TRIM elimina espacios
    // sobrantes de las columnas CHAR(50) y CHAR(200).
    const baseSelect = `
        SELECT
            TRIM(COALESCE(p.nombre, '')) AS proveedor,
            TRIM(i.codigo_item) AS codigo_item,
            TRIM(i.descripcion) AS descripcion,
            COALESCE(SUM(dv.cantidad_emp), 0)::float AS unidades_cajas,
            COALESCE(SUM(dv.subtotal), 0)::float AS subtotal
        FROM detalle_venta dv
        INNER JOIN venta v ON v.id_venta = dv.id_venta
        INNER JOIN item i ON i.id_item = dv.id_item
        LEFT JOIN proveedor p ON p.id_proveedor = i.id_proveedor
        ${joinVendedor}
        WHERE ${whereVenta}
        GROUP BY i.id_proveedor, p.nombre, i.codigo_item, i.descripcion
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM (${baseSelect}) AS sub`;
    const countRows = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT
    });
    const total = Number(countRows[0]?.total || 0);

    const rowsQuery = `${baseSelect} ORDER BY LOWER(COALESCE(p.nombre, '')) ASC, LOWER(i.descripcion) ASC`;

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
            subtotal: Number(r.subtotal || 0)
        })),
        paginacion: { total, paginado: false }
    };
};

module.exports = {
    getItemsVendidosPorRol,
    validarFechasObligatorias
};
