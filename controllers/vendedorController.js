const vendedor = require('../models').vendedor_model;
module.exports = {
    list(req, res) {
        return vendedor
            .findAll({})
            .then((vendedor) => res.status(200).send(vendedor))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return vendedor
            .findByPk(req.params.id)
            .then((vendedor) => {
                console.log(vendedor);
                if (!vendedor) {
                    return res.status(404).send({
                        message: 'vendedor Not Found',
                    });
                }
                return res.status(200).send(vendedor);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return vendedor
            .create({
                codigo_vendedor: req.body.codigo_vendedor,
                nombre: req.body.nombre,
                id_usuario: req.body.id_usuario,
                cuota: req.body.cuota,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,


            })
            .then((vendedor) => res.status(201).send(vendedor))
            .catch((error) => res.status(400).send(error));
    },
};