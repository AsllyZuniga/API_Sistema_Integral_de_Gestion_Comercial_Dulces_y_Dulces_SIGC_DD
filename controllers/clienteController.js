const clienteProductoService = require('../services/clienteProductoService');
const {
    cliente_model,
    ciudad_model,
    barrio_model,
    canal_model,
    tipo_negocio_model
} = require('../models');
module.exports = {
    async productosPorCliente(req, res) {
        try {
            const data = await clienteProductoService.getProductosPorCliente();
            res.status(200).send(data);
        } catch (error) {
            res.status(400).send(error);
        }
    },

    async productosPorClientePorVendedor(req, res) {
        try {
            const { idVendedor } = req.params;
            console.log('ID Vendedor recibido:', idVendedor); // Log para verificar el parámetro

            if (!idVendedor) {
                return res.status(400).send({ error: 'El parámetro idVendedor es requerido.' });
            }

            const data = await clienteProductoService.getProductosPorClientePorVendedor(idVendedor);
            res.status(200).send(data);
        } catch (error) {
            console.error('Error en productosPorClientePorVendedor:', error); // Log para capturar errores
            res.status(400).send({ error: 'Ocurrió un error al procesar la solicitud.', details: error.message });
        }
    },

    async debugProductosPorClientePorVendedor(req, res) {
        try {
            const { idVendedor } = req.params;
            console.log('ID Vendedor recibido:', idVendedor); // Log para verificar el parámetro

            if (!idVendedor) {
                return res.status(400).send({ error: 'El parámetro idVendedor es requerido.' });
            }

            const data = await clienteProductoService.debugProductosPorClientePorVendedor(idVendedor);
            res.status(200).send(data);
        } catch (error) {
            console.error('Error en debugProductosPorClientePorVendedor:', error); // Log para capturar errores
            res.status(400).send({ error: 'Ocurrió un error al procesar la solicitud.', details: error.message });
        }
    },

    async debugVentasPorVendedor(req, res) {
        try {
            const { idVendedor } = req.params;
            const data = await clienteProductoService.debugVentasPorVendedor(idVendedor);
            res.status(200).send(data);
        } catch (error) {
            res.status(400).send({ error: 'Ocurrió un error al procesar la solicitud.', details: error.message });
        }
    },

    list(req, res) {
        return cliente_model
            .findAll({
                include: [
                    { model: ciudad_model, as: 'ciudad' },
                    { model: barrio_model, as: 'barrio' },
                    { model: canal_model, as: 'canal' },
                    { model: tipo_negocio_model, as: 'tipoNegocio' }
                ]
            })
            .then((clientes) => res.status(200).send(clientes))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return cliente_model
            .findByPk(req.params.id, {
                include: [
                    { model: ciudad_model, as: 'ciudad' },
                    { model: barrio_model, as: 'barrio' },
                    { model: canal_model, as: 'canal' },
                    { model: tipo_negocio_model, as: 'tipoNegocio' }
                ]
            })
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
        return cliente_model
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
        return cliente_model
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