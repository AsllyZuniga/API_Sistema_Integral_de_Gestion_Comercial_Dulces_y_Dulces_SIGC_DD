const ventas_detalle = require('../models').ventas_detalle_model;
module.exports = {
    list(req, res) {
        return ventas_detalle
            .findAll({})
            .then((ventas_detalle) => res.status(200).send(ventas_detalle))
            .catch((error) => { res.status(400).send(error); });
    },
};