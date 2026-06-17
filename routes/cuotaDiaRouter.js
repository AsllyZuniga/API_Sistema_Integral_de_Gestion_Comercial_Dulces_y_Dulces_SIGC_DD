var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');

router.get('/', require('../controllers').cuotaDiaController.list);
router.post('/', require('../controllers').cuotaDiaController.add);

router.get('/por-dia', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                error: 'Los parámetros fecha_inicio y fecha_fin son requeridos'
            });
        }

        if (fecha_inicio !== fecha_fin) {
            return res.status(400).json({
                success: false,
                error: 'fecha_inicio y fecha_fin deben ser idénticas para consulta de un solo día'
            });
        }

        const data = await db.cuotaDia_model.findAll({
            where: {
                fecha_inicio: { [Op.lte]: fecha_inicio },
                fecha_fin: { [Op.gte]: fecha_inicio }
            },
            include: [{
                model: db.usuario_model,
                as: 'usuario',
                attributes: ['id_usuario', 'username', 'estado'],
                include: [{
                    model: db.vendedor_model,
                    as: 'vendedor',
                    attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
                }]
            }]
        });

        return res.status(200).json({
            success: true,
            data,
            message: 'Cuotas diarias encontradas'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/:id', require('../controllers').cuotaDiaController.getById);
router.put('/:id', require('../controllers').cuotaDiaController.update);

module.exports = router;

