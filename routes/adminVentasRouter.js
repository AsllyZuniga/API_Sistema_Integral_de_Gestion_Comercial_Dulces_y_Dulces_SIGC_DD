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
 * Elimina en transacción: primero detalle_venta, luego venta.
 */
router.delete('/ventas', requireAdmin, async (req, res) => {
    try {
        const data = await service.eliminarVentasPorRango(req.query.fechaInicio, req.query.fechaFin);
        return res.status(200).send({ success: true, data });
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
});

module.exports = router;
