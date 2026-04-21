const { proveedor_model } = require('../models');
module.exports = {
    list(req, res) {
        return proveedor_model
            .findAll({})
            .then((proveedor) => res.status(200).send(proveedor))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return proveedor_model
            .findByPk(req.params.id)
            .then((proveedor) => {
                console.log(proveedor);
                if (!proveedor) {
                    return res.status(404).send({
                        message: 'proveedor Not Found',
                    });
                }
                return res.status(200).send(proveedor);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return proveedor_model
            .create({
                codigo: req.body.codigo,
                nombre: req.body.nombre,
                cuota: req.body.cuota,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,
            })
            .then((proveedor) => res.status(201).send(proveedor))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return proveedor_model
            .findByPk(req.params.id)
            .then(proveedor => {
                if (!proveedor) {
                    return res.status(404).send({
                        message: 'proveedor Not Found',
                    });
                }
                return proveedor
                    .update({
                        codigo: req.body.codigo || proveedor.codigo,
                        nombre: req.body.nombre || proveedor.nombre,
                        cuota: req.body.cuota || proveedor.cuota,
                        fecha_inicio: req.body.fecha_inicio || proveedor.fecha_inicio,
                        fecha_fin: req.body.fecha_fin || proveedor.fecha_fin

                    })
                    .then(() => res.status(200).send(proveedor))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};