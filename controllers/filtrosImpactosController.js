'use strict';

const filtrosImpactosService = require('../services/filtrosImpactosService');
const { getVendedorScopeFromAuth } = require('../utils/scopeHelper');

module.exports = {
    async getOpciones(req, res) {
        try {
            const params = filtrosImpactosService.normalizeParams(req.query);
            const scope = await getVendedorScopeFromAuth(req.auth);
            const data = await filtrosImpactosService.getOpcionesFiltrosImpactos(params, scope);
            return res.status(200).send({
                success: true,
                data
            });
        } catch (error) {
            console.error('[filtrosImpactosController.getOpciones] error:', error);
            return res.status(500).send({
                success: false,
                error: error?.message || 'Error al obtener opciones de filtros para Impactos'
            });
        }
    }
};
