const detalle_venta = require('../models').detalle_venta_model;
module.exports = {
    list(req, res) {
        return detalle_venta
            .findAll({})
            .then((detalle_venta) => res.status(200).send(detalle_venta))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return detalle_venta
            .findByPk(req.params.id)
            .then((detalle_venta) => {
                console.log(detalle_venta);
                if (!detalle_venta) {
                    return res.status(404).send({
                        message: 'detalle_venta Not Found',
                    });
                }
                return res.status(200).send(detalle_venta);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};