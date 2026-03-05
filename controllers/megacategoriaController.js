const megacategoria = require('../models').megacategoria_model;
module.exports = {
    list(req, res) {
        return megacategoria
            .findAll({})
            .then((megacategoria) => res.status(200).send(megacategoria))
            .catch((error) => { res.status(400).send(error); });
    },
};