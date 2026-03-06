const { 
    venta_model, 
    detalle_venta_model, 
    tipo_documento_model, 
    cliente_model, 
    vendedor_model, 
    canal_model, 
    subcanal_model,
    usuario_model,
    ciudad_model,
    barrio_model,
    tipo_negocio_model,
    item_model
} = require('../models');
module.exports = {
    list(req, res) {
        return venta_model
            .findAll({
                include: [
                    { model: tipo_documento_model, as: 'tipoDocumento' },
                    { 
                        model: cliente_model, 
                        as: 'cliente',
                        include: [
                            { model: ciudad_model, as: 'ciudad' },
                            { model: barrio_model, as: 'barrio' },
                            { model: canal_model, as: 'canal' },
                            { model: tipo_negocio_model, as: 'tipoNegocio' }
                        ]
                    },
                    { 
                        model: vendedor_model, 
                        as: 'vendedor',
                        include: [{ model: usuario_model, as: 'usuario' }]
                    },
                    { model: canal_model, as: 'canal' },
                    { model: subcanal_model, as: 'subcanal' },
                    { 
                        model: detalle_venta_model, 
                        as: 'detalles',
                        include: [{ model: item_model, as: 'item' }]
                    }
                ]
            })
            .then((ventas) => res.status(200).send(ventas))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return venta_model
            .findByPk(req.params.id, {
                include: [
                    { model: tipo_documento_model, as: 'tipoDocumento' },
                    { 
                        model: cliente_model, 
                        as: 'cliente',
                        include: [
                            { model: ciudad_model, as: 'ciudad' },
                            { model: barrio_model, as: 'barrio' },
                            { model: canal_model, as: 'canal' },
                            { model: tipo_negocio_model, as: 'tipoNegocio' }
                        ]
                    },
                    { 
                        model: vendedor_model, 
                        as: 'vendedor',
                        include: [{ model: usuario_model, as: 'usuario' }]
                    },
                    { model: canal_model, as: 'canal' },
                    { model: subcanal_model, as: 'subcanal' },
                    { 
                        model: detalle_venta_model, 
                        as: 'detalles',
                        include: [{ model: item_model, as: 'item' }]
                    }
                ]
            })
            .then((venta) => {
                console.log(venta);
                if (!venta) {
                    return res.status(404).send({
                        message: 'venta Not Found',
                    });
                }
                return res.status(200).send(venta);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return venta_model
            .create({
                fecha: req.body.fecha,
                id_tipo_documento: req.body.id_tipo_documento,
                id_cliente: req.body.id_cliente,
                id_vendedor: req.body.id_vendedor,
                id_canal: req.body.id_canal,
                id_subcanal: req.body.id_subcanal,
                precio_unitario_con_impuesto: req.body.precio_unitario_con_impuesto,
                porcentaje_descuento: req.body.porcentaje_descuento
            })
            .then((venta) => res.status(201).send(venta))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return venta_model
            .findByPk(req.params.id)
            .then(venta => {
                if (!venta) {
                    return res.status(404).send({
                        message: 'venta Not Found',
                    });
                }
                return venta
                    .update({
                        fecha: req.body.fecha || venta.fecha,
                        id_tipo_documento: req.body.id_tipo_documento || venta.id_tipo_documento,
                        id_cliente: req.body.id_cliente || venta.id_cliente,
                        id_vendedor: req.body.id_vendedor || venta.id_vendedor,
                        id_canal: req.body.id_canal || venta.id_canal,
                        id_subcanal: req.body.id_subcanal || venta.id_subcanal,
                        precio_unitario_con_impuesto: req.body.precio_unitario_con_impuesto || venta.precio_unitario_con_impuesto,
                        porcentaje_descuento: req.body.porcentaje_descuento || venta.porcentaje_descuento
                    })
                    .then(() => res.status(200).send(venta))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};