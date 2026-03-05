const detalle_venta = require('../models').detalle_venta_model;
module.exports = {
    list(req, res) {
        return detalle_venta
            .findAll({})
            .then((detalle_venta) => res.status(200).send(detalle_venta))
            .catch((error) => { res.status(400).send(error); });
    },
};