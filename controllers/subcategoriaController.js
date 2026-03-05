const subcategoria = require('../models').subcategoria_model;
module.exports = {
    list(req, res) {
        return subcategoria
            .findAll({})
            .then((subcategoria) => res.status(200).send(subcategoria))
            .catch((error) => { res.status(400).send(error); });
    },
};