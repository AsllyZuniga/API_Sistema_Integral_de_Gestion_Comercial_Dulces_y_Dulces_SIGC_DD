const canal = require('../models').canal_model;
module.exports = {
    list(req, res) {
        return canal
            .findAll({})
            .then((canal) => res.status(200).send(canal))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return canal
            .findByPk(req.params.id)
            .then((canal) => {
                console.log(canal);
                if (!canal) {
                    return res.status(404).send({
                        message: 'canal Not Found',
                    });
                }
                return res.status(200).send(canal);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return canal
            .create({
                nombre: req.body.nombre,
            })
            .then((canal) => res.status(201).send(canal))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return canal
            .findByPk(req.params.id)
            .then(canal => {
                if (!canal) {
                    return res.status(404).send({
                        message: 'canal Not Found',
                    });
                }
                return canal
                    .update({
                        nombre: req.body.nombre || canal.nombre,
                    })
                    .then(() => res.status(200).send(canal))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};