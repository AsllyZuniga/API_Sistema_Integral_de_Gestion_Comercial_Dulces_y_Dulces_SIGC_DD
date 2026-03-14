const { 
    subcanal_model, 
    canal_model
} = require('../models');
module.exports = {
    list(req, res) {
        return subcanal
            .findAll({})
            .then((subcanal) => res.status(200).send(subcanal))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return subcanal
            .findByPk(req.params.id)
            .then((subcanal) => {
                console.log(subcanal);
                if (!subcanal) {
                    return res.status(404).send({
                        message: 'subcanal Not Found',
                    });
                }
                return res.status(200).send(subcanal);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return subcanal
            .create({
                nombre: req.body.nombre,
                id_canal: req.body.id_canal,
            })
            .then((subcanal) => res.status(201).send(subcanal))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return subcanal
            .findByPk(req.params.id)
            .then(subcanal => {
                if (!subcanal) {
                    return res.status(404).send({
                        message: 'subcanal Not Found',
                    });
                }
                return subcanal
                    .update({
                        nombre: req.body.nombre || subcanal.nombre,
                        id_canal: req.body.id_canal || subcanal.id_canal,
                    })
                    .then(() => res.status(200).send(subcanal))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};