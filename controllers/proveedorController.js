const { proveedor_model, item_model, categoria_model } = require('../models');
const { Sequelize } = require('sequelize');

module.exports = {
    list(req, res) {
        return proveedor_model
            .findAll({})
            .then((proveedor) => res.status(200).send(proveedor))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return proveedor_model
            .findByPk(req.params.id)
            .then((proveedor) => {
                console.log(proveedor);
                if (!proveedor) {
                    return res.status(404).send({
                        message: 'proveedor Not Found',
                    });
                }
                return res.status(200).send(proveedor);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return proveedor_model
            .create({
                codigo: req.body.codigo,
                nombre: req.body.nombre,
                cuota: req.body.cuota,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,
            })
            .then((proveedor) => res.status(201).send(proveedor))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return proveedor_model
            .findByPk(req.params.id)
            .then(proveedor => {
                if (!proveedor) {
                    return res.status(404).send({
                        message: 'proveedor Not Found',
                    });
                }
                return proveedor
                    .update({
                        codigo: req.body.codigo || proveedor.codigo,
                        nombre: req.body.nombre || proveedor.nombre,
                        cuota: req.body.cuota || proveedor.cuota,
                        fecha_inicio: req.body.fecha_inicio || proveedor.fecha_inicio,
                        fecha_fin: req.body.fecha_fin || proveedor.fecha_fin

                    })
                    .then(() => res.status(200).send(proveedor))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    },
    getCategoriasByProveedor(req, res) {
        const proveedorCodigo = req.params.codigo;

        return proveedor_model
            .findOne({
                where: { codigo: proveedorCodigo }
            })
            .then(proveedor => {
                if (!proveedor) {
                    return res.status(404).send({
                        success: false,
                        message: 'Proveedor no encontrado'
                    });
                }

                // Obtener todos los items del proveedor con sus categorías
                return item_model
                    .findAll({
                        where: { id_proveedor: proveedor.id_proveedor },
                        include: [{
                            model: categoria_model,
                            as: 'categoria',
                            attributes: ['id_categoria', 'nombre', 'id_megacategoria'],
                            include: [{
                                model: require('../models').megacategoria_model,
                                as: 'megacategoria',
                                attributes: ['id_megacategoria', 'nombre']
                            }]
                        }],
                        raw: true,
                        subQuery: false
                    })
                    .then(items => {
                        // Agrupar categorías únicas
                        const categoriasMap = {};

                        items.forEach(item => {
                            if (item['categoria.id_categoria']) {
                                const catId = item['categoria.id_categoria'];
                                if (!categoriasMap[catId]) {
                                    categoriasMap[catId] = {
                                        id_categoria: item['categoria.id_categoria'],
                                        nombre: item['categoria.nombre'],
                                        id_megacategoria: item['categoria.id_megacategoria'],
                                        megacategoria: {
                                            id_megacategoria: item['megacategoria.id_megacategoria'],
                                            nombre: item['megacategoria.nombre']
                                        },
                                        cantidad_items: 0
                                    };
                                }
                                categoriasMap[catId].cantidad_items++;
                            }
                        });

                        const categorias = Object.values(categoriasMap);

                        return res.status(200).send({
                            success: true,
                            proveedor: {
                                id_proveedor: proveedor.id_proveedor,
                                nombre: proveedor.nombre,
                                codigo: proveedor.codigo
                            },
                            total_categorias: categorias.length,
                            total_items: items.length,
                            categorias: categorias
                        });
                    })
                    .catch((error) => {
                        res.status(400).send({
                            success: false,
                            error: error.message
                        });
                    });
            })
            .catch((error) => {
                res.status(400).send({
                    success: false,
                    error: error.message
                });
            });
    }
};