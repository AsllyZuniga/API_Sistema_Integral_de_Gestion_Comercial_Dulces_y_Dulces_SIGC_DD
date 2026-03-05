const proveedor = require('../models').proveedor_model;
module.exports = {
    list(req, res) {
        return proveedor
            .findAll({})
            .then((proveedor) => res.status(200).send(proveedor))
            .catch((error) => { res.status(400).send(error); });
    },
};