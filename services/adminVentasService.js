'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const validarFechas = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) throw new Error('fechaInicio y fechaFin son requeridas');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin))
        throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    if (fechaInicio > fechaFin) throw new Error('fechaInicio debe ser <= fechaFin');
};

const previewEliminarVentas = async (fechaInicio, fechaFin) => {
    validarFechas(fechaInicio, fechaFin);
    const replacements = { fechaInicio, fechaFin };

    const [ventas, detalles] = await Promise.all([
        sequelize.query(
            `SELECT COUNT(*) AS total FROM venta WHERE CAST(fecha AS DATE) >= CAST(:fechaInicio AS DATE) AND CAST(fecha AS DATE) <= CAST(:fechaFin AS DATE)`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COUNT(*) AS total FROM detalle_venta dv
             JOIN venta v ON v.id_venta = dv.id_venta
             WHERE CAST(v.fecha AS DATE) >= CAST(:fechaInicio AS DATE) AND CAST(v.fecha AS DATE) <= CAST(:fechaFin AS DATE)`,
            { replacements, type: QueryTypes.SELECT }
        )
    ]);

    return {
        fechaInicio,
        fechaFin,
        ventasAEliminar: Number(ventas[0].total),
        detallesAEliminar: Number(detalles[0].total)
    };
};

const eliminarVentasPorRango = async (fechaInicio, fechaFin) => {
    validarFechas(fechaInicio, fechaFin);
    const replacements = { fechaInicio, fechaFin };

    return sequelize.transaction(async (t) => {
        const [detallesRows] = await sequelize.query(
            `DELETE FROM detalle_venta
             WHERE id_venta IN (
                 SELECT id_venta FROM venta WHERE CAST(fecha AS DATE) >= CAST(:fechaInicio AS DATE) AND CAST(fecha AS DATE) <= CAST(:fechaFin AS DATE)
             )
             RETURNING id_detalle`,
            { replacements, type: QueryTypes.SELECT, transaction: t }
        );

        const [ventasRows] = await sequelize.query(
            `DELETE FROM venta WHERE CAST(fecha AS DATE) >= CAST(:fechaInicio AS DATE) AND CAST(fecha AS DATE) <= CAST(:fechaFin AS DATE)
             RETURNING id_venta`,
            { replacements, type: QueryTypes.SELECT, transaction: t }
        );

        return {
            fechaInicio,
            fechaFin,
            ventasEliminadas: Array.isArray(ventasRows) ? ventasRows.length : 0,
            detallesEliminados: Array.isArray(detallesRows) ? detallesRows.length : 0
        };
    });
};

module.exports = { previewEliminarVentas, eliminarVentasPorRango };
