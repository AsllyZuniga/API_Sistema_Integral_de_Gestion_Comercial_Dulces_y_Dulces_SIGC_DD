const ciudad = require('../models').ciudad_model;
module.exports = {
    list(req, res) {
        return ciudad
            .findAll({})
            .then((ciudad) => res.status(200).send(ciudad))
            .catch((error) => { res.status(400).send(error); });
    },
};