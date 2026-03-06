const { 
    subcategoria_model, 
    categoria_model
} = require('../models');
module.exports = {
    list(req, res) {
        return subcategoria_model
            .findAll({
                include: [
                    { model: categoria_model, as: 'categoria' }
                ]
            })
            .then((subcategorias) => res.status(200).send(subcategorias))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return subcategoria_model
            .findByPk(req.params.id, {
                include: [
                    { model: categoria_model, as: 'categoria' }
                ]
            })
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
    },
    add(req, res) {
        return subcategoria_model
            .create({
                nombre: req.body.nombre,
                id_categoria: req.body.id_categoria,
            })
            .then((subcategoria) => res.status(201).send(subcategoria))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return subcategoria_model
            .findByPk(req.params.id)
            .then(subcategoria => {
                if (!subcategoria) {
                    return res.status(404).send({
                        message: 'subcategoria Not Found',
                    });
                }
                return subcategoria
                    .update({
                        nombre: req.body.nombre || subcategoria.nombre,
                        id_categoria: req.body.id_categoria || subcategoria.id_categoria,
                    })
                    .then(() => res.status(200).send(subcategoria))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};