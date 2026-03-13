const {
    barrio_model,
    ciudad_model
} = require('../models');
module.exports = {
    list(req, res) {
        return barrio
            .findAll({})
            .then((barrio) => res.status(200).send(barrio))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return barrio
            .findByPk(req.params.id)
            .then((barrio) => {
                console.log(barrio);
                if (!barrio) {
                    return res.status(404).send({
                        message: 'barrio Not Found',
                    });
                }
                return res.status(200).send(barrio);
            })
            .catch((error) =>
                res.status(400).send(error));
    },

    add(req, res) {
        return barrio
            .create({
                nombre: req.body.nombre,
                id_ciudad: req.body.id_ciudad,
            })
            .then((barrio) => res.status(201).send(barrio))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return barrio
            .findByPk(req.params.id)
            .then(barrio => {
                if (!barrio) {
                    return res.status(404).send({
                        message: 'barrio Not Found',
                    });
                }
                return barrio
                    .update({
                        nombre: req.body.nombre || barrio.nombre,
                        id_ciudad: req.body.id_ciudad || barrio.id_ciudad,
                    })
                    .then(() => res.status(200).send(barrio))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};