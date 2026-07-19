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

        const [deletedMeses, deletedSemanas, deletedDias] = await Promise.all([
            cuotaMesService.deleteByUser(id_usuario),
            cuotaSemanaService.deleteByUser(id_usuario),
            cuotaDiaService.deleteByUser(id_usuario)
        ]);

        await db.vendedor_model.update(
            { id_cuotaMes: null, id_cuotaSemana: null, id_cuotaDia: null },
            { where: { id_usuario } }
        );

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
