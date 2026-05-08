
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
        proveedor: query.proveedor,
        ciudad: query.ciudad
    };
    
    // Parsear múltiples categorías (separadas por coma o como array)
    // Soporta: IDs puros ("1,2,3") o formato descriptivo ("0001 - 1000-ACEITES VEGETALES")
    if (query.categoria) {
        let categoriasList = [];
        if (Array.isArray(query.categoria)) {
            categoriasList = query.categoria;
        } else {
            categoriasList = String(query.categoria).split(',');
        }
        filters.categorias = categoriasList
            .map(c => extractCategoryId(c))
            .filter(c => c);
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
            const codigoVendedor = String(req.auth?.codVendedor || '').trim();

            if (!codigoVendedor) {
                return res.status(403).send({
                    message: 'El usuario autenticado no tiene código de vendedor asociado'
                });
            }

            const data = await cumplimientoMesService.getCumplimientoMesFront({
                ...getFilters(req.query),
                vendedor: codigoVendedor
            });

            return res.status(200).send(data);
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
    }
};
