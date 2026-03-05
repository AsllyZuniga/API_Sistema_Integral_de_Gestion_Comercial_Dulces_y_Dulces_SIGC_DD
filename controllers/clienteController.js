const cliente = require('../models').cliente_model;
module.exports = {
    list(req, res) {
        return cliente
            .findAll({})
            .then((cliente) => res.status(200).send(cliente))
            .catch((error) => { res.status(400).send(error); });
    },
};