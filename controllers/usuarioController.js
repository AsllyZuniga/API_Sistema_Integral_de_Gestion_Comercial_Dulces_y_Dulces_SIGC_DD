const usuario = require('../models').usuario_model;
module.exports = {
    list(req, res) {
        return usuario
            .findAll({})
            .then((usuario) => res.status(200).send(usuario))
            .catch((error) => { res.status(400).send(error); });
    },
};