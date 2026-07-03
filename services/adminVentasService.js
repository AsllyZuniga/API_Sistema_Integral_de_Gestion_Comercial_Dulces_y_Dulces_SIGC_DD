'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const jobsStore = require('./adminVentasJobsStore');

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
            `SELECT COUNT(*) AS total FROM venta WHERE fecha >= :fechaInicio AND fecha <= :fechaFin`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COUNT(*) AS total FROM detalle_venta dv
             JOIN venta v ON v.id_venta = dv.id_venta
             WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin`,
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

const BATCH_SIZE = 2000;

const eliminarVentasPorRangoCore = async (jobId, fechaInicio, fechaFin) => {
    jobsStore.actualizar(jobId, { status: 'running', startedAt: new Date().toISOString() });

    const idsVentas = await sequelize.query(
        `SELECT id_venta FROM venta WHERE fecha >= :fechaInicio AND fecha <= :fechaFin ORDER BY id_venta`,
        { replacements: { fechaInicio, fechaFin }, type: QueryTypes.SELECT }
    );

    const totalVentas = idsVentas.length;
    if (!totalVentas) {
        jobsStore.actualizar(jobId, {
            status: 'completed',
            ventasEliminadas: 0,
            detallesEliminados: 0,
            progress: 100,
            finishedAt: new Date().toISOString()
        });
        return;
    }

    const todas = idsVentas.map(r => r.id_venta);

    const [detCount] = await sequelize.query(
        `SELECT COUNT(*) AS total FROM detalle_venta WHERE id_venta IN (${todas.join(',')})`,
        { type: QueryTypes.SELECT }
    );
    const totalDetalles = Number(detCount.total);

    jobsStore.actualizar(jobId, {
        totalEstimado: totalVentas,
        detallesEliminados: totalDetalles,
        progress: 5
    });

    const lotes = [];
    for (let i = 0; i < todas.length; i += BATCH_SIZE) {
        lotes.push(todas.slice(i, i + BATCH_SIZE));
    }

    let detallesDone = 0;
    for (const lote of lotes) {
        await sequelize.query(
            `DELETE FROM detalle_venta WHERE id_venta IN (${lote.join(',')})`,
            { type: QueryTypes.DELETE }
        );
        detallesDone += lote.length;
        jobsStore.actualizar(jobId, {
            progress: Math.min(5 + Math.round((detallesDone / todas.length) * 45), 50)
        });
    }

    let ventasDone = 0;
    for (const lote of lotes) {
        await sequelize.query(
            `DELETE FROM venta WHERE id_venta IN (${lote.join(',')})`,
            { type: QueryTypes.DELETE }
        );
        ventasDone += lote.length;
        jobsStore.actualizar(jobId, {
            progress: Math.min(50 + Math.round((ventasDone / todas.length) * 50), 100)
        });
    }

    jobsStore.actualizar(jobId, {
        status: 'completed',
        ventasEliminadas: totalVentas,
        detallesEliminados: totalDetalles,
        progress: 100,
        finishedAt: new Date().toISOString()
    });
};

const iniciarEliminacion = async (fechaInicio, fechaFin) => {
    validarFechas(fechaInicio, fechaFin);

    const job = jobsStore.crear();
    jobsStore.actualizar(job.jobId, { fechaInicio, fechaFin });

    setImmediate(() => {
        eliminarVentasPorRangoCore(job.jobId, fechaInicio, fechaFin).catch((error) => {
            jobsStore.actualizar(job.jobId, {
                status: 'failed',
                error: error.message,
                finishedAt: new Date().toISOString()
            });
        });
    });

    return {
        jobId: job.jobId,
        status: 'pending',
        fechaInicio,
        fechaFin,
        message: 'Eliminación iniciada en background. Consulta el jobId para ver el progreso.'
    };
};

const obtenerEstadoJob = (jobId) => {
    return jobsStore.obtener(jobId);
};

module.exports = {
    previewEliminarVentas,
    iniciarEliminacion,
    obtenerEstadoJob
};

