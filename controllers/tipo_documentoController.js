const { tipo_documento_model } = require('../models');
module.exports = {
    list(req, res) {
        return tipo_documento
            .findAll({})
            .then((tipo_documento) => res.status(200).send(tipo_documento))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return tipo_documento
            .findByPk(req.params.id)
            .then((tipo_documento) => {
                console.log(tipo_documento);
                if (!tipo_documento) {
                    return res.status(404).send({
                        message: 'tipo_documento Not Found',
                    });
                }
                return res.status(200).send(tipo_documento);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return tipo_documento
            .create({
                nombre: req.body.nombre,
                consecutivo: req.body.consecutivo,
            })
            .then((tipo_documento) => res.status(201).send(tipo_documento))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return tipo_documento
            .findByPk(req.params.id)
            .then(tipo_documento => {
                if (!tipo_documento) {
                    return res.status(404).send({
                        message: 'tipo_documento Not Found',
                    });
                }
                return tipo_documento
                    .update({
                        nombre: req.body.nombre || tipo_documento.nombre,
                        consecutivo: req.body.consecutivo || tipo_documento.consecutivo
                    })
                    .then(() => res.status(200).send(tipo_documento))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};