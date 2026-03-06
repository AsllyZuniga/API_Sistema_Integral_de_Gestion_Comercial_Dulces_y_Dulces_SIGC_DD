const cliente = require('../models').cliente_model;
module.exports = {
    list(req, res) {
        return cliente
            .findAll({})
            .then((cliente) => res.status(200).send(cliente))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return cliente
            .findByPk(req.params.id)
            .then((cliente) => {
                console.log(cliente);
                if (!cliente) {
                    return res.status(404).send({
                        message: 'cliente Not Found',
                    });
                }
                return res.status(200).send(cliente);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};