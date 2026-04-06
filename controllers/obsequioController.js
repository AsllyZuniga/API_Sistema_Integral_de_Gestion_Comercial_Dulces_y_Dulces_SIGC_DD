const { obsequio_model } = require('../models');
module.exports = {
    list(req, res) {
        return obsequio
            .findAll({})
            .then((obsequio) => res.status(200).send(obsequio))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return obsequio
            .findByPk(req.params.id)
            .then((obsequio) => {
                console.log(obsequio);
                if (!obsequio) {
                    return res.status(404).send({
                        message: 'obsequio Not Found',
                    });
                }
                return res.status(200).send(obsequio);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return obsequio
            .create({
                descripcion: req.body.descripcion,
                valor_obsequio: req.body.valor_obsequio,
            })
            .then((obsequio) => res.status(201).send(obsequio))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return obsequio
            .findByPk(req.params.id)
            .then(obsequio => {
                if (!obsequio) {
                    return res.status(404).send({
                        message: 'obsequio Not Found',
                    });
                }
                return obsequio
                    .update({
                        descripcion: req.body.descripcion || obsequio.descripcion,
                        valor_obsequio: req.body.valor_obsequio || obsequio.valor_obsequio
                    })
                    .then(() => res.status(200).send(obsequio))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }

};