const { Op } = require('sequelize');
const db = require('../../models');

module.exports = {
    // 1. Reporte General
    async getCumplimientoCuotaMes(req, res) {
        const { getCumplimientoCuotaMesService } = require('../../services/cumplimientoMesService');
        try {
            const { fechaInicio, fechaFin } = req.query;
            const result = await getCumplimientoCuotaMesService(fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error", error: error.message });
        }
    },

    // 2. Reporte por Código de Vendedor
    async getCumplimientoPorCodigo(req, res) {
        const { getCumplimientoPorCodigoService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const { fechaInicio, fechaFin } = req.query;
            const result = await getCumplimientoPorCodigoService(codigo, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al filtrar por código", error: error.message });
        }
    },

    // 3. Reporte filtrado por Línea (Todos los vendedores)
    async getCumplimientoPorLinea(req, res) {
        const { getCumplimientoPorLineaService } = require('../../services/cumplimientoMesService');
        try {
            const linea = req.params.linea || req.query.linea;
            const { fechaInicio, fechaFin } = req.query;
            if (!linea) {
                return res.status(400).send({ message: "Debe proporcionar el nombre de la línea." });
            }
            const result = await getCumplimientoPorLineaService(linea, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error", error: error.message });
        }
    },

    // 4. Reporte filtrado por Vendedor y Línea
    async getCumplimientoVendedorYLinea(req, res) {
        const { getCumplimientoVendedorYLineaService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const linea = req.query.linea || req.params.linea;
            const { fechaInicio, fechaFin } = req.query;

            if (!codigo || !linea) {
                return res.status(400).send({ message: "Debe proporcionar el código del vendedor y el nombre de la línea." });
            }
            const result = await getCumplimientoVendedorYLineaService(codigo, linea, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al filtrar por vendedor y línea", error: error.message });
        }
    },

    // 5. Reporte de Desglose de Líneas de un Vendedor
    async getCumplimientoVendedorDetalleLineas(req, res) {
        const { getCumplimientoVendedorDetalleLineasService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const { fechaInicio, fechaFin } = req.query;
            const result = await getCumplimientoVendedorDetalleLineasService(codigo, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener detalle por líneas", error: error.message });
        }
    },

    // 6. Reporte de Desglose por Ciudad de un Vendedor
    async getCumplimientoVendedorPorCiudad(req, res) {
        const { getCumplimientoVendedorPorCiudadService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const { fechaInicio, fechaFin } = req.query;
            const result = await getCumplimientoVendedorPorCiudadService(codigo, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener cumplimiento por ciudades", error: error.message });
        }
    },

    // 7. Reporte de Desglose de Productos de un Vendedor
    async getProductosVendidosPorVendedor(req, res) {
        const { getProductosVendidosPorVendedorService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const { fechaInicio, fechaFin } = req.query;
            const result = await getProductosVendidosPorVendedorService(codigo, fechaInicio, fechaFin);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener los productos vendidos", error: error.message });
        }
    }
}; 