'use strict';

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/requireAdmin');
const service = require('../services/adminVentasService');

/**
 * GET /admin/ventas/preview?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 * Muestra cuántos registros se eliminarían sin borrar nada.
 */
router.get('/ventas/preview', requireAdmin, async (req, res) => {
    try {
        const data = await service.previewEliminarVentas(req.query.fechaInicio, req.query.fechaFin);
        return res.status(200).send({ success: true, data });
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
});

/**
 * DELETE /admin/ventas?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 * Inicia eliminación en background. Devuelve 202 con jobId.
 * El job corre en el servidor aunque el cliente desconecte.
 */
router.delete('/ventas', requireAdmin, async (req, res) => {
    try {
        const data = await service.iniciarEliminacion(req.query.fechaInicio, req.query.fechaFin);
        return res.status(202).send({ success: true, data });
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
});

/**
 * GET /admin/ventas/job/:jobId
 * Consulta el estado de un job de eliminación.
 */
router.get('/ventas/job/:jobId', requireAdmin, async (req, res) => {
    try {
        const job = service.obtenerEstadoJob(req.params.jobId);
        if (!job) {
            return res.status(404).send({ success: false, error: 'Job no encontrado o expirado' });
        }
        return res.status(200).send({ success: true, data: job });
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
});

module.exports = router;

