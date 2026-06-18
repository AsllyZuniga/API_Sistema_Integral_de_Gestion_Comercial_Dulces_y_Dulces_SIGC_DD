var express = require('express');
var router = express.Router();
const rolController = require('../controllers').rolController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { Op } = require('sequelize');
const db = require('../models');

router.get('/', rolController.list);
router.get('/:id', rolController.getById);
router.post('/', rolController.add);

router.get('/cuota-dia/por-supervisor', requireAuthJWT, async (req, res) => {
    try {
        const adminId = req.auth.idUsuario;
        const adminRolId = req.auth.rol;

        if (String(adminRolId) !== '2') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo supervisores pueden consultar este endpoint'
            });
        }

        const { fecha_inicio, fecha_fin, id_supervisor } = req.query;

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

        if (!id_supervisor) {
            return res.status(400).json({
                success: false,
                error: 'El parámetro id_supervisor es requerido'
            });
        }

        const supervisor = await db.usuario_model.findOne({
            where: { id_usuario: id_supervisor, id_rol: 2 }
        });

        if (!supervisor) {
            return res.status(404).json({
                success: false,
                error: 'Supervisor no encontrado o no tiene rol de Supervisor (id_rol=2)'
            });
        }

        const vendedoresAsignados = await db.vendedor_model.findAll({
            where: { id_supervisor: id_supervisor }
        });

        const vendedorIds = vendedoresAsignados.map(v => v.id_usuario).filter(Boolean);

        if (vendedorIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No hay vendedores asignados a este supervisor',
                supervisor: { id_usuario: supervisor.id_usuario, username: supervisor.username }
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
                where: { id_usuario: { [Op.in]: vendedorIds } },
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
            message: 'Cuotas diarias del supervisor encontradas',
            supervisor: { id_usuario: supervisor.id_usuario, username: supervisor.username },
            total_vendedores: data.length
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/cuota-dia/por-vendedor', requireAuthJWT, async (req, res) => {
    try {
        const vendedorRolId = req.auth.rol;

        if (String(vendedorRolId) !== '3') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo vendedores pueden consultar este endpoint'
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

        const vendedorRecord = await db.vendedor_model.findOne({
            where: { id_usuario: req.auth.idUsuario }
        });

        if (!vendedorRecord) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró un vendedor asociado a este usuario'
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
                fecha_fin: { [Op.gte]: fecha_inicio },
                id_usuario: req.auth.idUsuario
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

        if (cuotas.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No hay cuotas diarias registradas para este vendedor en la fecha solicitada',
                vendedor: { id_vendedor: vendedorRecord.id_vendedor, codigo_vendedor: vendedorRecord.codigo_vendedor, nombre: vendedorRecord.nombre }
            });
        }

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
            message: 'Cuota diaria del vendedor encontrada',
            vendedor: { id_vendedor: vendedorRecord.id_vendedor, codigo_vendedor: vendedorRecord.codigo_vendedor, nombre: vendedorRecord.nombre }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;