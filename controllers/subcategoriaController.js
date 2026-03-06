const subcategoria = require('../models').subcategoria_model;
module.exports = {
    list(req, res) {
        return subcategoria
            .findAll({})
            .then((subcategoria) => res.status(200).send(subcategoria))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return subcategoria
            .findByPk(req.params.id)
            .then((subcategoria) => {
                console.log(subcategoria);
                if (!subcategoria) {
                    return res.status(404).send({
                        message: 'subcategoria Not Found',
                    });
                }
                return res.status(200).send(subcategoria);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};