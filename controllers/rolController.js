const rol = require('../models').rol_model;
module.exports = {
    list(req, res) {
        return rol
            .findAll({})
            .then((rol) => res.status(200).send(rol))
            .catch((error) => { res.status(400).send(error); });
    },
};