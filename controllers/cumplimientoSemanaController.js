const cumplimientoSemanaService = require('../services/cumplimientoSemana');

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
    // Para el vendedor autenticado ("Mi cumplimiento semanal")
    async listFrontMe(req, res) {
        try {
            const codigoVendedor = String(req.auth?.codVendedor || '').trim();
            if (!codigoVendedor) {
                return res.status(403).send({
                    message: 'El usuario autenticado no tiene código de vendedor asociado'
                });
            }
            const data = await cumplimientoSemanaService.getCumplimientoSemanaFront({
                ...getFilters(req.query),
                vendedor: codigoVendedor
            });
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    // Para admins/supervisores (todos los vendedores)
    async listFront(req, res) {
        try {
            const data = await cumplimientoSemanaService.getCumplimientoSemanaFront(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    // Para obtener el cumplimiento de un vendedor específico
    async getByCodigo(req, res) {
        try {
            const data = await cumplimientoSemanaService.getCumplimientoSemanaPorCodigo(req.params.codigo, getFilters(req.query));
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

    // Por proveedor (líneas)
    async getLineasPorVendedor(req, res) {
        try {
            const data = await cumplimientoSemanaService.getLineasPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    // Por proveedor específico
    async getLineaEspecificaPorVendedor(req, res) {
        try {
            const data = await cumplimientoSemanaService.getLineaEspecificaPorVendedor(
                req.params.codigoVendedor,
                req.params.codigoLinea,
                getFilters(req.query)
            );
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    // Por ciudad
    async getCiudadesPorVendedor(req, res) {
        try {
            const data = await cumplimientoSemanaService.getCiudadesPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    // Por producto/item
    async getProductosPorVendedor(req, res) {
        try {
            const data = await cumplimientoSemanaService.getProductosPorVendedor(req.params.codigoVendedor, getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
