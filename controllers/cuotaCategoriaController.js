const cuotaCategoriaService = require('../services/cuotaCategoria');

const getFilters = (query) => ({
	fechaInicio: query.fechaInicio,
	fechaFin: query.fechaFin
});

module.exports = {
	async general(req, res) {
		try {
			const data = await cuotaCategoriaService.getCuotaCategoriaGeneral(getFilters(req.query));
			return res.status(200).send(data);
		} catch (error) {
			return res.status(400).send(error);
		}
	}
};
