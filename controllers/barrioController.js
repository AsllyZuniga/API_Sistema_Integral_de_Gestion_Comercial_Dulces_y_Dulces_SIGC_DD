const barrio = require('../models').barrio_model;
module.exports = {
    list(req, res) {
        return barrio
            .findAll({})
            .then((barrio) => res.status(200).send(barrio))
            .catch((error) => { res.status(400).send(error); });
    },
};