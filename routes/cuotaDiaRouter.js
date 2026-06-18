var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/', require('../controllers').cuotaDiaController.list);
router.post('/', require('../controllers').cuotaDiaController.add);

router.get('/por-dia', requireAuthJWT, async (req, res) => {
    try {
        const rolId = req.auth.rol;

        if (String(rolId) !== '1') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo administradores pueden consultar este endpoint'
            });
        }

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

        const rangoDias = await db.rango_dias_model.findOne({
            where: {
                fecha_inicio: { [Op.lte]: fecha_inicio },
                fecha_fin: { [Op.gte]: fecha_inicio }
            }
        });

        const cuotas = await db.cuotaDia_model.findAll({
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

        const data = await Promise.all(cuotas.map(async (cuota) => {
            const vendedor = cuota.usuario?.vendedor;
            let venta_acumulada_dia = 0;

            if (vendedor) {
                const [result] = await db.sequelize.query(
                    `SELECT COALESCE(SUM(d.subtotal), 0) as total FROM "public"."detalle_venta" d INNER JOIN "public"."venta" v ON d.id_venta = v.id_venta WHERE v.id_vendedor = :id_vendedor AND v.fecha = :fecha`,
                    {
                        replacements: { id_vendedor: vendedor.id_vendedor, fecha: fecha_inicio },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );

                venta_acumulada_dia = parseFloat(result.total) || 0;
            }

            const cuota_dia = parseFloat(cuota.cuota_dia) || 0;
            const pct_cumplimiento = cuota_dia > 0 ? (venta_acumulada_dia / cuota_dia) * 100 : 0;

            const dias_corridos = rangoDias?.dias_corridos || 1;
            const dias_habiles = rangoDias?.dias_habiles || 1;
            const proye_venta = (dias_corridos * dias_habiles) > 0
                ? (venta_acumulada_dia / (dias_corridos * dias_habiles)) * 100
                : 0;

            return {
                ...cuota.toJSON(),
                venta_acumulada_dia,
                pct_cumplimiento: parseFloat(pct_cumplimiento.toFixed(2)),
                proye_venta: parseFloat(proye_venta.toFixed(2)),
                dias_corridos,
                dias_habiles
            };
        }));

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

