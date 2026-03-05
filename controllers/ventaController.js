const venta = require('../models').venta_model;
module.exports = {
    list(req, res) {
        return venta
            .findAll({})
            .then((venta) => res.status(200).send(venta))
            .catch((error) => { res.status(400).send(error); });
    },
};