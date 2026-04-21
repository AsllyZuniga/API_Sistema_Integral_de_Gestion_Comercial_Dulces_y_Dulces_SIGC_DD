const { validateCuotasMarzo, compareCuotasCSVvsBD } = require('../services/cuotaCategoria');

module.exports = {
	/**
	 * GET /cuota-categoria/validar-marzo
	 * Valida que todas las cuotas de marzo estén cargadas correctamente
	 * Comprueba integridad de datos vendedor-categoría-cuota
	 */
	async validateCuotasMarzo(req, res) {
		try {
			const { fechaInicio = '2026-03-01', fechaFin = '2026-03-31' } = req.query;

			const resultado = await validateCuotasMarzo(fechaInicio, fechaFin);

			if (resultado.error) {
				return res.status(400).send({
					success: false,
					error: resultado.mensaje,
					details: resultado
				});
			}

			return res.status(200).send({
				success: true,
				mensaje: 'Validación de cuotas de marzo completada',
				...resultado
			});

		} catch (error) {
			console.error('Error en validateCuotasMarzo:', error);
			return res.status(500).send({
				success: false,
				error: error.message
			});
		}
	},

	/**
	 * POST /cuota-categoria/comparar-csv
	 * Compara datos del CSV de cuotas con los datos en BD
	 * 
	 * Body esperado:
	 * {
	 *   "fechaInicio": "2026-03-01",
	 *   "cuotas": [
	 *     { "codigo_vendedor": "0150", "categorias": { "0300 - 1000-CAFES": 38090263, ... } },
	 *     ...
	 *   ]
	 * }
	 */
	async compareCuotasConCSV(req, res) {
		try {
			const { fechaInicio = '2026-03-01', cuotas = [] } = req.body;

			if (!Array.isArray(cuotas) || cuotas.length === 0) {
				return res.status(400).send({
					success: false,
					error: 'Se requiere un array de cuotas en el body'
				});
			}

			const resultado = await compareCuotasCSVvsBD(cuotas, fechaInicio);

			if (resultado.error) {
				return res.status(400).send({
					success: false,
					error: resultado.mensaje
				});
			}

			return res.status(200).send({
				success: true,
				mensaje: 'Comparación CSV vs BD completada',
				...resultado
			});

		} catch (error) {
			console.error('Error en compareCuotasConCSV:', error);
			return res.status(500).send({
				success: false,
				error: error.message
			});
		}
	}
};
