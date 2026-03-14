const { 
    item_model, 
    megacategoria_model, 
    categoria_model, 
    subcategoria_model, 
    proveedor_model, 
    obsequio_model
} = require('../models');
module.exports = {
    list(req, res) {
        return item_model
            .findAll({
                include: [
                    { model: megacategoria_model, as: 'megacategoria' },
                    { model: categoria_model, as: 'categoria' },
                    { model: subcategoria_model, as: 'subcategoria' },
                    { model: proveedor_model, as: 'proveedor' },
                    { model: obsequio_model, as: 'obsequio' }
                ]
            })
            .then((items) => res.status(200).send(items))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return item_model
            .findByPk(req.params.id, {
                include: [
                    { model: megacategoria_model, as: 'megacategoria' },
                    { model: categoria_model, as: 'categoria' },
                    { model: subcategoria_model, as: 'subcategoria' },
                    { model: proveedor_model, as: 'proveedor' },
                    { model: obsequio_model, as: 'obsequio' }
                ]
            })
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
        return item_model
            .create({
                codigo_item: req.body.codigo_item,
                descripcion: req.body.descripcion,
                unidad_medida_empaque: req.body.unidad_medida_empaque,
                unidad_medida_orden: req.body.unidad_medida_orden,
                cantidad_empaque: req.body.cantidad_empaque,
                peso_kilo: req.body.peso_kilo,
                factor_um_empaque: req.body.factor_um_empaque,
                factor_um_orden: req.body.factor_um_orden,
                id_megacategoria: req.body.id_megacategoria,
                id_categoria: req.body.id_categoria,
                id_subcategoria: req.body.id_subcategoria,
                id_proveedor: req.body.id_proveedor,
                id_obsequio: req.body.id_obsequio,
            })
            .then((item) => res.status(201).send(item))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return item_model
            .findByPk(req.params.id)
            .then(item => {
                if (!item) {
                    return res.status(404).send({
                        message: 'item Not Found',
                    });
                }
                return item
                    .update({
                        codigo_item: req.body.codigo_item || item.codigo_item,
                        descripcion: req.body.descripcion || item.descripcion,
                        unidad_medida_empaque: req.body.unidad_medida_empaque || item.unidad_medida_empaque,
                        unidad_medida_orden: req.body.unidad_medida_orden || item.unidad_medida_orden,
                        cantidad_empaque: req.body.cantidad_empaque || item.cantidad_empaque,
                        peso_kilo: req.body.peso_kilo || item.peso_kilo,
                        factor_um_empaque: req.body.factor_um_empaque || item.factor_um_empaque,
                        factor_um_orden: req.body.factor_um_orden || item.factor_um_orden,
                        id_megacategoria: req.body.id_megacategoria || item.id_megacategoria,
                        id_categoria: req.body.id_categoria || item.id_categoria,
                        id_subcategoria: req.body.id_subcategoria || item.id_subcategoria,
                        id_proveedor: req.body.id_proveedor || item.id_proveedor,
                        id_obsequio: req.body.id_obsequio || item.id_obsequio
                    })
                    .then(() => res.status(200).send(item))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};