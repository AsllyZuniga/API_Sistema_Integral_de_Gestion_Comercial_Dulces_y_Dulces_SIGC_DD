const { 
    ciudad_model, 
    barrio_model
} = require('../models');
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
    },
    add(req, res) {
        return ciudad
            .create({
                nombre: req.body.nombre,
            })
            .then((ciudad) => res.status(201).send(ciudad))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return ciudad
            .findByPk(req.params.id)
            .then(ciudad => {
                if (!ciudad) {
                    return res.status(404).send({
                        message: 'ciudad Not Found',
                    });
                }
                return ciudad
                    .update({
                        nombre: req.body.nombre || ciudad.nombre,
                    })
                    .then(() => res.status(200).send(ciudad))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};