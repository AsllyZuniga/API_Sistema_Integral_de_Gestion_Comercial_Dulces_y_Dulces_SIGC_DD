const cliente = require('../models').cliente_model;
module.exports = {
    list(req, res) {
        return cliente
            .findAll({})
            .then((cliente) => res.status(200).send(cliente))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return cliente
            .findByPk(req.params.id)
            .then((cliente) => {
                console.log(cliente);
                if (!cliente) {
                    return res.status(404).send({
                        message: 'cliente Not Found',
                    });
                }
                return res.status(200).send(cliente);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return cliente
            .create({
                nro_documento: req.body.nro_documento,
                razon_social: req.body.razon_social,
                sucursal: req.body.sucursal,
                direccion: req.body.direccion,
                nombre_establecimiento: req.body.nombre_establecimiento,
                id_ciudad: req.body.id_ciudad,
                id_barrio: req.body.id_barrio,
                id_canal: req.body.id_canal,
                id_tipo_negocio: req.body.id_tipo_negocio
            })
            .then((cliente) => res.status(201).send(cliente))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return cliente
            .findByPk(req.params.id)
            .then(cliente => {
                if (!cliente) {
                    return res.status(404).send({
                        message: 'cliente Not Found',
                    });
                }
                return cliente
                    .update({
                        nro_documento: req.body.nro_documento || cliente.nro_documento,
                        razon_social: req.body.razon_social || cliente.razon_social,
                        sucursal: req.body.sucursal || cliente.sucursal,
                        direccion: req.body.direccion || cliente.direccion,
                        nombre_establecimiento: req.body.nombre_establecimiento || cliente.nombre_establecimiento,
                        id_ciudad: req.body.id_ciudad || cliente.id_ciudad,
                        id_barrio: req.body.id_barrio || cliente.id_barrio,
                        id_canal: req.body.id_canal || cliente.id_canal,
                        id_tipo_negocio: req.body.id_tipo_negocio || cliente.id_tipo_negocio
                    })
                    .then(() => res.status(200).send(cliente))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};