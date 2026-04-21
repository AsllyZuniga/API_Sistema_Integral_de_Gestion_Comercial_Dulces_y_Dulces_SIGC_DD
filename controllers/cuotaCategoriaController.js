const cuotaCategoriaService = require('../services/cuotaCategoria');
const { parseDateRange } = require('../utils/dateHelper');

const getFilters = (query) => {
    try {
        // Intentar parsear fechas desde mesAnio o fechaInicio/fechaFin
        const { fechaInicio, fechaFin } = parseDateRange(
            query.mesAnio,
            query.fechaInicio,
            query.fechaFin
        );
        return { fechaInicio, fechaFin };
    } catch (error) {
        // Si hay error en parsing, retornar las fechas tal como vienen
        // (para mantener compatibilidad)
        return {
            fechaInicio: query.fechaInicio,
            fechaFin: query.fechaFin
        };
    }
};

module.exports = {
    async general(req, res) {
        try {
            const data = await cuotaCategoriaService.getCuotaCategoriaGeneral(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async byVendedor(req, res) {
        try {
            const data = await cuotaCategoriaService.getCuotaCategoriaPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            if (!data) {
                return res.status(404).send({
                    message: 'Vendedor no encontrado'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async todosVendedores(req, res) {
        try {
            const data = await cuotaCategoriaService.getCuotaCategoriaTodosVendedores(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
