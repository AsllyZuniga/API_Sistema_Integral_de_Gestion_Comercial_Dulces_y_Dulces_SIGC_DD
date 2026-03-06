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
    },
    add(req, res) {
        return usuario
            .create({
                username: req.body.username,
                password: req.body.password,
                estado: req.body.estado,
                id_rol: req.body.id_rol,
            })
            .then((usuario) => res.status(201).send(usuario))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return usuario
            .findByPk(req.params.id)
            .then(usuario => {
                if (!usuario) {
                    return res.status(404).send({
                        message: 'usuario Not Found',
                    });
                }
                return usuario
                    .update({
                        username: req.body.username || usuario.username,
                        password: req.body.password || usuario.password,
                        estado: req.body.estado || usuario.estado,
                        id_rol: req.body.id_rol || usuario.id_rol,
                    })
                    .then(() => res.status(200).send(usuario))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};