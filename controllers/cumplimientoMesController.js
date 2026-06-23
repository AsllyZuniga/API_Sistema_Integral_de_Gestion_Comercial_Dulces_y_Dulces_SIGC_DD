
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const cumplimientoMesService = require('../services/cumplimientoMesService');

const extractCategoryId = (categoryStr) => {
    // Extrae el ID numérico de strings como "0001 - 1000-ACEITES VEGETALES"
    const parts = String(categoryStr).split('-');
    if (parts.length >= 2) {
        // Toma el segundo elemento y extrae solo números
        const idMatch = parts[1].match(/\d+/);
        if (idMatch) return idMatch[0];
    }
    // Si no hay guion, intenta extraer números directamente
    const match = String(categoryStr).match(/\d+/);
    return match ? match[0] : categoryStr;
};

const getFilters = (query) => {
    const filters = {
        fechaInicio: query.fechaInicio,
        fechaFin: query.fechaFin,
        vendedor: query.vendedor,
        ciudad: query.ciudad
    };

    if (query.proveedor) {
        const list = Array.isArray(query.proveedor)
            ? query.proveedor
            : String(query.proveedor).split(',');
        filters.proveedores = list.map(p => p.trim()).filter(Boolean);
        filters.proveedor = filters.proveedores[0];
    }

    if (query.categoria) {
        const list = Array.isArray(query.categoria)
            ? query.categoria
            : String(query.categoria).split(',');
        filters.categorias = list.map(c => extractCategoryId(c)).filter(Boolean);
    }

    return filters;
};

module.exports = {
    async getCiudadEspecificaPorVendedor(req, res) {
        try {
            const filters = getFilters(req.query);
            filters.ciudad = req.params.idCiudad;
            const data = await cumplimientoMesService.getCiudadesPorVendedor(req.params.codigoVendedor, filters);
            // Solo devolver la ciudad solicitada
            const detalle = (data.detallePorCiudad || []).filter(c => String(c.id_ciudad) === String(req.params.idCiudad));
            return res.status(200).send({
                codigoVendedor: req.params.codigoVendedor,
                detallePorCiudad: detalle
            });
        } catch (error) {
            return res.status(400).send(error);
        }
    },
    async listFrontMe(req, res) {
        try {
            const idRol = String(req.auth?.rol ?? '');
            const idUsuario = req.auth?.idUsuario;
            const codigoVendedor = String(req.auth?.codVendedor || '').trim();
            const filters = getFilters(req.query);

            // Admin: sin filtro de vendedor
            if (idRol === '1') {
                const data = await cumplimientoMesService.getCumplimientoMesFront(filters);
                return res.status(200).send(data);
            }

            // Supervisor: solo vendedores asignados a su equipo
            if (idRol === '2' && idUsuario) {
                const vendedoresAsignados = await sequelize.query(`
                    SELECT codigo_vendedor FROM vendedor
                    WHERE id_supervisor = :idUsuario AND codigo_vendedor IS NOT NULL
                `, {
                    replacements: { idUsuario },
                    type: QueryTypes.SELECT
                });

                const codigos = vendedoresAsignados.map(v => v.codigo_vendedor).filter(Boolean);

                if (codigos.length === 0) {
                    return res.status(200).send({
                        periodo: filters,
                        detalle: [],
                        totales: { cuotaTotal: 0, ventaTotal: 0, porcCumplimiento: 0, proyeccionTotal: 0, porcCumplimientoProyectado: 0 }
                    });
                }

                const data = await cumplimientoMesService.getCumplimientoMesFront({
                    ...filters,
                    vendedores: codigos
                });
                return res.status(200).send(data);
            }

            // Vendedor: solo sus propias ventas/cuotas
            if (codigoVendedor) {
                const data = await cumplimientoMesService.getCumplimientoMesFront({
                    ...filters,
                    vendedor: codigoVendedor
                });
                return res.status(200).send(data);
            }

            return res.status(403).send({
                message: 'El usuario autenticado no tiene código de vendedor asociado'
            });
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async listFront(req, res) {
        try {
            const data = await cumplimientoMesService.getCumplimientoMesFront(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

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

    async getByVendedor(req, res) {
        try {
            const data = await cumplimientoMesService.getCumplimientoPorCodigo(req.params.codigoVendedor, getFilters(req.query));
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

    async getLineaEspecificaPorVendedor(req, res) {
        try {
            const data = await cumplimientoMesService.getLineaEspecificaPorVendedor(
                req.params.codigoVendedor,
                req.params.codigoLinea,
                getFilters(req.query)
            );
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
    },

    async getLineas(req, res) {
        try {
            const data = await cumplimientoMesService.getLineasGeneral(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getCiudadesGlobal(req, res) {
        try {
            const data = await cumplimientoMesService.getCumplimientoPorCiudadGlobal(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
