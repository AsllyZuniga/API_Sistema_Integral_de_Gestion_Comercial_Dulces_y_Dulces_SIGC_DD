const ciudad = require('../models').ciudad_model;
module.exports = {
    list(req, res) {
        return ciudad
            .findAll({})
            .then((ciudad) => res.status(200).send(ciudad))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return ciudad
            .findByPk(req.params.id)
            .then((ciudad) => {
                console.log(ciudad);
                if (!ciudad) {
                    return res.status(404).send({
                        message: 'ciudad Not Found',
                    });
                }
                return res.status(200).send(ciudad);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};