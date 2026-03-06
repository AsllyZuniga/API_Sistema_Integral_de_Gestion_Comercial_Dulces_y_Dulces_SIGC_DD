const rol = require('../models').rol_model;
module.exports = {
    list(req, res) {
        return rol
            .findAll({})
            .then((rol) => res.status(200).send(rol))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return rol
            .findByPk(req.params.id)
            .then((rol) => {
                console.log(rol);
                if (!rol) {
                    return res.status(404).send({
                        message: 'rol Not Found',
                    });
                }
                return res.status(200).send(rol);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return rol
            .create({
                nombre: req.body.nombre,
            })
            .then((rol) => res.status(201).send(rol))
            .catch((error) => res.status(400).send(error));
    },
};