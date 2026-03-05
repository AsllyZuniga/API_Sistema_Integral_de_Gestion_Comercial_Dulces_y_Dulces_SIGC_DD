const tipo_negocio = require('../models').tipo_negocio_model;
module.exports = {
    list(req, res) {
        return tipo_negocio
            .findAll({})
            .then((tipo_negocio) => res.status(200).send(tipo_negocio))
            .catch((error) => { res.status(400).send(error); });
    },
};