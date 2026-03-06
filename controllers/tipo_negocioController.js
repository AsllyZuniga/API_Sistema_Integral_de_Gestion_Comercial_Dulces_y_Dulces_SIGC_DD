const tipo_negocio = require('../models').tipo_negocio_model;
module.exports = {
    list(req, res) {
        return tipo_negocio
            .findAll({})
            .then((tipo_negocio) => res.status(200).send(tipo_negocio))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return tipo_negocio
            .findByPk(req.params.id)
            .then((tipo_negocio) => {
                console.log(tipo_negocio);
                if (!tipo_negocio) {
                    return res.status(404).send({
                        message: 'tipo_negocio Not Found',
                    });
                }
                return res.status(200).send(tipo_negocio);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return tipo_negocio
            .create({
                tipo_negocio: req.body.tipo_negocio,
                detalle_tipo_negocio: req.body.detalle_tipo_negocio,
            })
            .then((tipo_negocio) => res.status(201).send(tipo_negocio))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return tipo_negocio
            .findByPk(req.params.id)
            .then(tipo_negocio => {
                if (!tipo_negocio) {
                    return res.status(404).send({
                        message: 'tipo_negocio Not Found',
                    });
                }
                return tipo_negocio
                    .update({
                        tipo_negocio: req.body.tipo_negocio || tipo_negocio.tipo_negocio,
                        detalle_tipo_negocio: req.body.detalle_tipo_negocio || tipo_negocio.detalle_tipo_negocio
                    })
                    .then(() => res.status(200).send(tipo_negocio))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};