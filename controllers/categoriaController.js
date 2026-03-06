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
    }
};