const { Op } = require('sequelize');
const db = require('../../models');

const Vendedores = db.vendedores_model;
const Ventas = db.ventas_model;
const VentasDetalle = db.ventas_detalle_model;
const CuotasVendedores = db.cuotas_vendedores_model;
const CuotaMes = db.cuota_mes_model;
const RegistroDias = db.registro_dias_model;
const Clientes = db.clientes_model;
const Productos = db.productos_model;

module.exports = {
    async getCumplimientoCuotaMes(req, res) {
        const { getCumplimientoCuotaMesService } = require('../../services/cumplimientoMesService');
        try {
            const result = await getCumplimientoCuotaMesService();
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error", error: error.message });
        }
    },
    async getCumplimientoPorCodigo(req, res) {
        const { getCumplimientoPorCodigoService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const result = await getCumplimientoPorCodigoService(codigo);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al filtrar por código", error: error.message });
        }
    },
    async getCumplimientoPorLinea(req, res) {
        const { getCumplimientoPorLineaService } = require('../../services/cumplimientoMesService');
        try {
            const linea = req.params.linea || req.query.linea;
            if (!linea) {
                return res.status(400).send({ message: "Debe proporcionar el nombre de la línea." });
            }
            const result = await getCumplimientoPorLineaService(linea);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error", error: error.message });
        }
    },
    async getCumplimientoVendedorYLinea(req, res) {
        const { getCumplimientoVendedorYLineaService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const linea = req.query.linea || req.params.linea;
            if (!codigo || !linea) {
                return res.status(400).send({
                    message: "Debe proporcionar el código del vendedor y el nombre de la línea."
                });
            }
            const result = await getCumplimientoVendedorYLineaService(codigo, linea);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al filtrar por vendedor y línea", error: error.message });
        }
    },
    async getCumplimientoVendedorDetalleLineas(req, res) {
        const { getCumplimientoVendedorDetalleLineasService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const result = await getCumplimientoVendedorDetalleLineasService(codigo);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener detalle por líneas", error: error.message });
        }
    },
    async getCumplimientoVendedorPorCiudad(req, res) {
        const { getCumplimientoVendedorPorCiudadService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const result = await getCumplimientoVendedorPorCiudadService(codigo);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener cumplimiento por ciudades", error: error.message });
        }
    },
    async getProductosVendidosPorVendedor(req, res) {
        const { getProductosVendidosPorVendedorService } = require('../../services/cumplimientoMesService');
        try {
            const { codigo } = req.params;
            const result = await getProductosVendidosPorVendedorService(codigo);
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({ message: "Error al obtener los productos vendidos", error: error.message });
        }
    }
};

