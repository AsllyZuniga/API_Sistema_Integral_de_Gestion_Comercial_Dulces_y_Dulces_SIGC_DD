const detalle_venta = require('../models').detalle_venta_model;
module.exports = {
    list(req, res) {
        return detalle_venta
            .findAll({})
            .then((detalle_venta) => res.status(200).send(detalle_venta))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return detalle_venta
            .findByPk(req.params.id)
            .then((detalle_venta) => {
                console.log(detalle_venta);
                if (!detalle_venta) {
                    return res.status(404).send({
                        message: 'detalle_venta Not Found',
                    });
                }
                return res.status(200).send(detalle_venta);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return detalle_venta
            .create({
                id_venta: req.body.id_venta,
                id_item: req.body.id_item,
                cantidad_emp: req.body.cantidad_emp,
                cantidad: req.body.cantidad,
                precio_unitario: req.body.precio_unitario,
                descuento: req.body.descuento,
                subtotal: req.body.subtotal,
                costo_promedio_total: req.body.costo_promedio_total,
            })
            .then((detalle_venta) => res.status(201).send(detalle_venta))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return detalle_venta
            .findByPk(req.params.id)
            .then(detalle_venta => {
                if (!detalle_venta) {
                    return res.status(404).send({
                        message: 'detalle_venta Not Found',
                    });
                }
                return detalle_venta
                    .update({
                        id_venta: req.body.id_venta || detalle_venta.id_venta,
                        id_item: req.body.id_item || detalle_venta.id_item,
                        cantidad_emp: req.body.cantidad_emp || detalle_venta.cantidad_emp,
                        cantidad: req.body.cantidad || detalle_venta.cantidad,
                        precio_unitario: req.body.precio_unitario || detalle_venta.precio_unitario,
                        descuento: req.body.descuento || detalle_venta.descuento,
                        subtotal: req.body.subtotal || detalle_venta.subtotal,
                        costo_promedio_total: req.body.costo_promedio_total || detalle_venta.costo_promedio_total
                    })
                    .then(() => res.status(200).send(detalle_venta))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};