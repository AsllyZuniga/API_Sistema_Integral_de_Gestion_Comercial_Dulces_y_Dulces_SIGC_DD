const item = require('../models').item_model;
module.exports = {
    list(req, res) {
        return item
            .findAll({})
            .then((item) => res.status(200).send(item))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return item
            .findByPk(req.params.id)
            .then((item) => {
                console.log(item);
                if (!item) {
                    return res.status(404).send({
                        message: 'item Not Found',
                    });
                }
                return res.status(200).send(item);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return item
            .create({
                codigo_item: req.body.codigo_item,
                descripcion: req.body.descripcion,
                unidad_medida_empaque: req.body.unidad_medida_empaque,
                unidad_medida_oden: req.body.unidad_medida_oden,
                cantidad_empaque: req.body.cantidad_empaque,
                peso_kilo: req.body.peso_kilo,
                factor_um_empaque: req.body.factor_um_empaque,
                factor_um_oden: req.body.factor_um_oden,
                id_megacategoria: req.body.id_megacategoria,
                id_categoria: req.body.id_categoria,
                id_subcategoria: req.body.id_subcategoria,
                id_proveedor: req.body.id_proveedor,
                id_obsequio: req.body.id_obsequio,
            })
            .then((item) => res.status(201).send(item))
            .catch((error) => res.status(400).send(error));
    },
};