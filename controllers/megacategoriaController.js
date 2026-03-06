const megacategoria = require('../models').megacategoria_model;
module.exports = {
    list(req, res) {
        return megacategoria
            .findAll({})
            .then((megacategoria) => res.status(200).send(megacategoria))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return megacategoria
            .findByPk(req.params.id)
            .then((megacategoria) => {
                console.log(megacategoria);
                if (!megacategoria) {
                    return res.status(404).send({
                        message: 'megacategoria Not Found',
                    });
                }
                return res.status(200).send(megacategoria);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return megacategoria
            .create({
                nombre: req.body.nombre,
            })
            .then((megacategoria) => res.status(201).send(megacategoria))
            .catch((error) => res.status(400).send(error));
    },
};