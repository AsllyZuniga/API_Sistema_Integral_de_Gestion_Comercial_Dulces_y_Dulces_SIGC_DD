const canal = require('../models').canal_model;
module.exports = {
    list(req, res) {
        return canal
            .findAll({})
            .then((canal) => res.status(200).send(canal))
            .catch((error) => { res.status(400).send(error); });
    },
};