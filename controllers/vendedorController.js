const {
    vendedor_model,
    usuario_model
} = require('../models');
module.exports = {
    list(req, res) {
        return vendedor_model
            .findAll({
                include: [
                    { model: usuario_model, as: 'usuario' }
                ]
            })
            .then((vendedores) => res.status(200).send(vendedores))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return vendedor_model
            .findByPk(req.params.id, {
                include: [
                    { model: usuario_model, as: 'usuario' }
                ]
            })
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
        return vendedor_model
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
    update(req, res) {
        return vendedor_model
            .findByPk(req.params.id)
            .then(vendedor => {
                if (!vendedor) {
                    return res.status(404).send({
                        message: 'vendedor Not Found',
                    });
                }
                return vendedor
                    .update({
                        codigo_vendedor: req.body.codigo_vendedor || vendedor.codigo_vendedor,
                        nombre: req.body.nombre || vendedor.nombre,
                        id_usuario: req.body.id_usuario || vendedor.id_usuario,
                        cuota: req.body.cuota || vendedor.cuota,
                        fecha_inicio: req.body.fecha_inicio || vendedor.fecha_inicio,
                        fecha_fin: req.body.fecha_fin || vendedor.fecha_fin
                    })
                    .then(() => res.status(200).send(vendedor))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};