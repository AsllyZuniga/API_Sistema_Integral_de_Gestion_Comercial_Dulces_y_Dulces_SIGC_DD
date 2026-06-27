'use strict';

const filtrosService = require('../services/filtrosService');

/**
 * GET /api/filtros/opciones
 *
 * Devuelve, en una sola llamada, las opciones de los 4 desplegables
 * (vendedor, proveedor, categoría, ciudad) ya filtradas en cascada
 * por los demás valores seleccionados y por el rol del JWT.
 *
 * Query params (todos opcionales, arrays vía repetido o comma-separated):
 *   - fechaInicio, fechaFin       (YYYY-MM-DD; default: mes actual)
 *   - codVendedor[]               (codigo_vendedor; ignorado para rol 3)
 *   - codProveedor[]              (match contra detalle_venta.reporte_prov_con_obs)
 *   - codCategoria[]              (id_categoria)
 *   - codCiudad[]                 (id_ciudad)
 */
module.exports = {
    async getOpciones(req, res) {
        try {
            const params = filtrosService.normalizeParams(req.query);
            const data = await filtrosService.getOpcionesFiltros(params, req.auth);
            return res.status(200).send({
                success: true,
                data
            });
        } catch (error) {
            console.error('[filtrosController.getOpciones] error:', error);
            return res.status(500).send({
                success: false,
                error: error?.message || 'Error al obtener opciones de filtros'
            });
        }
    }
};
