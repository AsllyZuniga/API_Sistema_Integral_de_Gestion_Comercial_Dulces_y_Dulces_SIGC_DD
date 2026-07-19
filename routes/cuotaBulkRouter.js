const express = require('express');
const router = express.Router();
const db = require('../models');
const { requireAdmin } = require('../middlewares/requireAdmin');
const cuotaMesService = require('../services/cuotaMesService');
const cuotaSemanaService = require('../services/cuotaSemanaService');
const cuotaDiaService = require('../services/cuotaDiaService');

router.delete('/usuario/:id_usuario', requireAdmin, async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { fecha_inicio, fecha_fin } = req.query;

        const [deletedMeses, deletedSemanas, deletedDias] = await Promise.all([
            cuotaMesService.deleteByUser(id_usuario, fecha_inicio, fecha_fin),
            cuotaSemanaService.deleteByUser(id_usuario, fecha_inicio, fecha_fin),
            cuotaDiaService.deleteByUser(id_usuario, fecha_inicio, fecha_fin)
        ]);

        // Solo limpiar las FK del vendedor cuando se borró sin rango (todo el
        // histórico). Con rango, la cuota vigente puede seguir existiendo y
        // el FK no debe tocarse.
        if (!fecha_inicio || !fecha_fin) {
            await db.vendedor_model.update(
                { id_cuotaMes: null, id_cuotaSemana: null, id_cuotaDia: null },
                { where: { id_usuario } }
            );
        }

        return res.status(200).json({
            success: true,
            data: {
                cuota_mes: deletedMeses,
                cuota_semana: deletedSemanas,
                cuota_dia: deletedDias
            },
            message: `Cuotas eliminadas para usuario ${id_usuario}`
        });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
