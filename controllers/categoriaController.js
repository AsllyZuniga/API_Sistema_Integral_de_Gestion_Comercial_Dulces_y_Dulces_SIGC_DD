const cumplimientoMesService = require('../services/cumplimientoMesService');
const { 
    detalle_venta_model, 
    venta_model, 
    item_model,
    categoria_model,
    subcategoria_model,
    megacategoria_model,
    proveedor_model,
    obsequio_model
} = require('../models');

module.exports = {
    // 1. MÉTODO DE REPORTE CORREGIDO
    async getReportePorCategoria(req, res) {
        try {
            const { id_vendedor, fechaInicio, fechaFin } = req.query;

            // Llamamos a la función con consulta SQL que agrupa por nombre
            const resultado = await cumplimientoMesService.getReporteCategoriasSigc(id_vendedor, { 
                fechaInicio, 
                fechaFin 
            });

            const { rows, periodo } = resultado;

            // Calculamos el total acumulado de todas las categorías sumadas
            const totalGeneral = rows.reduce((acc, row) => acc + parseFloat(row.acumulado || 0), 0);

            // Formateamos el detalle para el JSON
            const detalleFinal = rows.map(row => {
                const valorAcumulado = parseFloat(row.acumulado || 0);
                return {
                    id_categoria: row.id_categoria,
                    categoria: row.categoria,
                    cuota: 0,
                    acumulado: valorAcumulado,
                    porcentajeCumplimiento: 0,
                    part: totalGeneral > 0 ? parseFloat(((valorAcumulado / totalGeneral) * 100).toFixed(2)) : 0,
                    proyectado: valorAcumulado,
                    porcentajeCumplimientoProyectado: 0
                };
            });

            res.status(200).send({
                vendedor: {
                    id_vendedor: parseInt(id_vendedor)
                },
                periodo: periodo, // Usa el periodo devuelto por el servicio, que ya tiene dias_corridos
                detalle: detalleFinal,
                total: {
                    categoria: "TOTAL X CATEGORIA",
                    cuota: 0,
                    acumulado: totalGeneral,
                    part: 100,
                    proyectado: totalGeneral,
                    porcentajeCumplimientoProyectado: 0
                }
            });

        } catch (error) {
            console.error("Error en reporte SIGC DD:", error);
            res.status(400).send({ message: "Error al generar reporte", error: error.message });
        }
    },

    // 2. Mantenemos el resto de tu CRUD intacto
    list(req, res) {
        return detalle_venta_model
            .findAll({
                include: [
                    { model: venta_model, as: 'venta' },
                    { 
                        model: item_model, 
                        as: 'item',
                        include: [
                            { model: megacategoria_model, as: 'megacategoria' },
                            { model: categoria_model, as: 'categoria' },
                            { model: subcategoria_model, as: 'subcategoria' },
                            { model: proveedor_model, as: 'proveedor' },
                            { model: obsequio_model, as: 'obsequio' }
                        ]
                    }
                ]
            })
            .then((detalle_venta) => res.status(200).send(detalle_venta))
            .catch((error) => res.status(400).send(error));
    },

    getById(req, res) {
        return detalle_venta_model
            .findByPk(req.params.id, {
                include: [
                    { model: venta_model, as: 'venta' },
                    { model: item_model, as: 'item' }
                ]
            })
            .then((detalle_venta) => {
                if (!detalle_venta) return res.status(404).send({ message: 'No encontrado' });
                return res.status(200).send(detalle_venta);
            })
            .catch((error) => res.status(400).send(error));
    },

    add(req, res) {
        const { cantidad, precio_unitario, descuento } = req.body;
        const subtotal = (cantidad * precio_unitario) - (descuento || 0);
        return detalle_venta_model
            .create({ ...req.body, subtotal })
            .then((detalle) => res.status(201).send(detalle))
            .catch((err) => res.status(400).send(err));
    },

    update(req, res) {
        return detalle_venta_model
            .findByPk(req.params.id)
            .then(detalle => {
                if (!detalle) return res.status(404).send({ message: 'No encontrado' });
                const cantidad = req.body.cantidad || detalle.cantidad;
                const precio_unitario = req.body.precio_unitario || detalle.precio_unitario;
                const descuento = req.body.descuento || detalle.descuento;
                const subtotal = (cantidad * precio_unitario) - (descuento || 0);
                return detalle.update({ ...req.body, subtotal })
                    .then(() => res.status(200).send(detalle));
            });
    }
};