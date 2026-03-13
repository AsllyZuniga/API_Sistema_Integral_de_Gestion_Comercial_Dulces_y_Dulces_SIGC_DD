const cumplimientoMesService = require('../services/cumplimientoMesService');

const getFilters = (query) => ({
    fechaInicio: query.fechaInicio,
    fechaFin: query.fechaFin,
    vendedor: query.vendedor,
    proveedor: query.proveedor,
    categoria: query.categoria,
    ciudad: query.ciudad
});

module.exports = {
    async list(req, res) {
        try {
            const data = await cumplimientoMesService.getCumplimientoMes(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getByCodigo(req, res) {
        try {
            const data = await cumplimientoMesService.getCumplimientoPorCodigo(req.params.codigo, getFilters(req.query));
            if (!data) {
                return res.status(404).send({
                    message: 'Cumplimiento no encontrado para el vendedor'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getLineasPorVendedor(req, res) {
        try {
            const data = await cumplimientoMesService.getLineasPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getCiudadesPorVendedor(req, res) {
        try {
            const data = await cumplimientoMesService.getCiudadesPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getProductosPorVendedor(req, res) {
        try {
            const data = await cumplimientoMesService.getProductosPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
