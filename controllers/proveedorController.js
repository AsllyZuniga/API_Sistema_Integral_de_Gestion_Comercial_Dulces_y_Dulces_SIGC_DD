const proveedor = require('../models').proveedor_model;
module.exports = {
    list(req, res) {
        return proveedor
            .findAll({})
            .then((proveedor) => res.status(200).send(proveedor))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return proveedor
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
    }
};