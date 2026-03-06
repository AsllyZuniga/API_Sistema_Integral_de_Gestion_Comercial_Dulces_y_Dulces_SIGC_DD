const usuario = require('../models').usuario_model;
module.exports = {
    list(req, res) {
        return usuario
            .findAll({})
            .then((usuario) => res.status(200).send(usuario))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return usuario
            .findByPk(req.params.id)
            .then((usuario) => {
                console.log(usuario);
                if (!usuario) {
                    return res.status(404).send({
                        message: 'usuario Not Found',
                    });
                }
                return res.status(200).send(usuario);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};