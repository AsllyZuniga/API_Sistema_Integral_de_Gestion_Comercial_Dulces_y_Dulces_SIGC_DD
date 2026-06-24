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
 * Paginación: solo admin y supervisor (page/limit). Vendedor devuelve todos los items.
 *
 * @param {object} options
 *   - fechaInicio, fechaFin (YYYY-MM-DD, obligatorios)
 *   - idRol ('1' | '2' | '3')
 *   - idUsuario, idVendedor (del token JWT)
 *   - page, limit (solo admin/supervisor)
 * @returns {Promise<{rows: Array, paginacion: object} | {error: string, code: string}>}
 */
const getItemsVendidosPorRol = async ({
    fechaInicio,
    fechaFin,
    idRol,
    idUsuario = null,
    idVendedor = null,
    page = 1,
    limit = 10
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
                paginacion: { page: Number(page) || 1, limit: Number(limit) || 10, total: 0, paginado: true }
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

    const usarPaginacion = idRol === '1' || idRol === '2';
    const whereVenta = filtrosVenta.join(' AND ');

    // SQL crudo (en lugar del ORM) para tener control exacto del
    // GROUP BY y del conteo de filas agrupadas: con el ORM el count
    // y los rows no se sincronizan bien cuando hay agregación + LIMIT.
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
        WHERE ${whereVenta}
        GROUP BY i.id_proveedor, p.nombre, i.codigo_item, i.descripcion
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM (${baseSelect}) AS sub`;
    const countRows = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT
    });
    const total = Number(countRows[0]?.total || 0);

    let paginacion;
    let rowsQuery = `${baseSelect} ORDER BY LOWER(COALESCE(p.nombre, '')) ASC, LOWER(i.descripcion) ASC`;

    if (usarPaginacion) {
        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const safeLimit = Math.max(Math.min(parseInt(limit, 10) || 10, 100), 1);
        const offset = (safePage - 1) * safeLimit;
        replacements.limit = safeLimit;
        replacements.offset = offset;
        rowsQuery += ' LIMIT :limit OFFSET :offset';
        paginacion = { page: safePage, limit: safeLimit, total, paginado: true };
    } else {
        paginacion = { total, paginado: false };
    }

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
        paginacion
    };
};

module.exports = {
    getItemsVendidosPorRol,
    validarFechasObligatorias
};
