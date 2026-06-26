const cuotaCategoriaService = require('../services/cuotaCategoria');
const { parseDateRange } = require('../utils/dateHelper');

const getFilters = (query) => {
    try {
        const { fechaInicio, fechaFin } = parseDateRange(
            query.mesAnio,
            query.fechaInicio,
            query.fechaFin
        );
        return { fechaInicio, fechaFin };
    } catch (error) {
        return {
            fechaInicio: query.fechaInicio,
            fechaFin: query.fechaFin
        };
    }
};

module.exports = {
    /**
     * GET /cuota-categoria/general
     * Endpoint role-aware: filtra por rol desde el JWT.
     */
    async general(req, res) {
        try {
            const data = await cuotaCategoriaService.getCuotaCategoriaGeneral(
                getFilters(req.query),
                req.auth
            );
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async deleteById(req, res) {
        try {
            const result = await cuotaCategoriaService.deleteById(req.params.id);
            return res.status(200).send({ success: true, message: 'Cuota de categoría eliminada correctamente' });
        } catch (error) {
            return res.status(500).send({ error: error.message });
        }
    },

    async deleteByDateRange(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const result = await cuotaCategoriaService.deleteByDateRange(fechaInicio, fechaFin);
            return res.status(200).send(result);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    }
};
