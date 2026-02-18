const ventas = require('../models').ventas_model;
module.exports = {
    list(req, res) {
        return ventas
            .findAll({})
            .then((ventas) => res.status(200).send(ventas))
            .catch((error) => { res.status(400).send(error); });
    },
};