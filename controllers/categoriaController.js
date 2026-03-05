const categoria = require('../models').categoria_model;
module.exports = {
    list(req, res) {
        return categoria
            .findAll({})
            .then((categoria) => res.status(200).send(categoria))
            .catch((error) => { res.status(400).send(error); });
    },
};