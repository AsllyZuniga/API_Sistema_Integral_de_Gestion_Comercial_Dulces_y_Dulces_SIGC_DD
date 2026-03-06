const venta = require('../models').venta_model;
module.exports = {
    list(req, res) {
        return venta
            .findAll({})
            .then((venta) => res.status(200).send(venta))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return venta
            .findByPk(req.params.id)
            .then((venta) => {
                console.log(venta);
                if (!venta) {
                    return res.status(404).send({
                        message: 'venta Not Found',
                    });
                }
                return res.status(200).send(venta);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return venta
            .create({
                codigo_vendedor: req.body.codigo_vendedor,
                nombre: req.body.nombre,
                id_usuario: req.body.id_usuario,
                cuota: req.body.cuota,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,
            })
            .then((venta) => res.status(201).send(venta))
            .catch((error) => res.status(400).send(error));
    },
};