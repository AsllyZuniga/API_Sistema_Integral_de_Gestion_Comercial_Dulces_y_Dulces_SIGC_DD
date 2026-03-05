const tipo_documento = require('../models').tipo_documento_model;
module.exports = {
    list(req, res) {
        return tipo_documento
            .findAll({})
            .then((tipo_documento) => res.status(200).send(tipo_documento))
            .catch((error) => { res.status(400).send(error); });
    },
};