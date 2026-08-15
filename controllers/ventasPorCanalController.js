'use strict';

const ventasPorCanalService = require('../services/ventasPorCanalService');
const { parseDateRange } = require('../utils/dateHelper');

const getFilters = (query) => {
    let base;
    try {
        const { fechaInicio, fechaFin } = parseDateRange(
            query.mesAnio,
            query.fechaInicio,
            query.fechaFin
        );
        base = { fechaInicio, fechaFin };
    } catch (error) {
        base = {
            fechaInicio: query.fechaInicio,
            fechaFin: query.fechaFin
        };
    }

    const toArr = (val) => {
        if (val == null || val === '') return undefined;
        const raw = Array.isArray(val) ? val : String(val).split(',');
        const flat = raw.flatMap((v) => String(v).split(',').map((s) => s.trim())).filter(Boolean);
        const arr = [...new Set(flat)];
        return arr.length ? arr : undefined;
    };

    const canales = toArr(query.canal);
    const vendedores = toArr(query.vendedor);
    const proveedores = toArr(query.proveedor);
    const categorias = toArr(query.categoria);
    const ciudades = toArr(query.ciudad);

    return {
        ...base,
        canal: canales ? canales[0] : undefined,
        canales,
        vendedor: vendedores ? vendedores[0] : undefined,
        vendedores,
        proveedor: proveedores ? proveedores[0] : undefined,
        proveedores,
        categoria: categorias ? categorias[0] : undefined,
        categorias,
        ciudad: ciudades ? ciudades[0] : undefined,
        ciudades
    };
};

module.exports = {
    /**
     * GET /api/ventas-por-canal
     *
     * Endpoint ADMIN (etapa 1): ventas acumuladas por canal con proyección.
     */
    async general(req, res) {
        try {
            const data = await ventasPorCanalService.getVentasPorCanal(
                getFilters(req.query),
                req.auth
            );
            return res.status(200).send(data);
        } catch (error) {
            console.error('[ventasPorCanalController.general] error:', error);
            return res.status(400).send({
                success: false,
                error: error?.message || 'Error al obtener ventas por canal'
            });
        }
    }
};
