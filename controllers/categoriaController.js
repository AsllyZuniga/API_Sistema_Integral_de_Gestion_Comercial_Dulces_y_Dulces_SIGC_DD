const categoria = require('../models').categoria_model;
module.exports = {
    list(req, res) {
        return categoria
            .findAll({})
            .then((categoria) => res.status(200).send(categoria))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return categoria
            .findByPk(req.params.id)
            .then((categoria) => {
                console.log(categoria);
                if (!categoria) {
                    return res.status(404).send({
                        message: 'categoria Not Found',
                    });
                }
                return res.status(200).send(categoria);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return categoria
            .create({
                nombre: req.body.nombre,
                id_megacategoria: req.body.id_megacategoria,
                cuota: req.body.cuota,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,
            })
            .then((categoria) => res.status(201).send(categoria))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return categoria
            .findByPk(req.params.id)
            .then(categoria => {
                if (!categoria) {
                    return res.status(404).send({
                        message: 'categoria Not Found',
                    });
                }
                return categoria
                    .update({
                        nombre: req.body.nombre || categoria.nombre,
                        id_megacategoria: req.body.id_megacategoria || categoria.id_megacategoria,
                        cuota: req.body.cuota || categoria.cuota,
                        fecha_inicio: req.body.fecha_inicio || categoria.fecha_inicio,
                        fecha_fin: req.body.fecha_fin || categoria.fecha_fin
                    })
                    .then(() => res.status(200).send(categoria))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};