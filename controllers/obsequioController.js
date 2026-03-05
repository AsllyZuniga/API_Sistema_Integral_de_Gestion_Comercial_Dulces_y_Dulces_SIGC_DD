const obsequio = require('../models').obsequio_model;
module.exports = {
    list(req, res) {
        return obsequio
            .findAll({})
            .then((obsequio) => res.status(200).send(obsequio))
            .catch((error) => { res.status(400).send(error); });
    },
};