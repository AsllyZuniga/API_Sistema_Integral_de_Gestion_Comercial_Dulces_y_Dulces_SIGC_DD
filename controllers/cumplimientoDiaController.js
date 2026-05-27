const cumplimientoDiaService = require('../services/cumplimientoDiaService');

const extractCategoryId = (categoryStr) => {
    const parts = String(categoryStr).split('-');
    if (parts.length >= 2) {
        const idMatch = parts[1].match(/\d+/);
        if (idMatch) return idMatch[0];
    }
    const match = String(categoryStr).match(/\d+/);
    return match ? match[0] : categoryStr;
};

const getFilters = (query) => {
    const filters = {
        fechaInicio: query.fechaInicio,
        fechaFin: query.fechaFin,
        vendedor: query.vendedor
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
    /**
     * GET /dia/cumplimiento/front/me
     * Para el vendedor autenticado - muestra sus ventas diarias
     */
    async listFrontMe(req, res) {
        try {
            const codigoVendedor = String(req.auth?.codVendedor || '').trim();

            if (!codigoVendedor) {
                return res.status(403).send({
                    message: 'El usuario autenticado no tiene código de vendedor asociado'
                });
            }

            const data = await cumplimientoDiaService.getCumplimientoDiaVendedor(
                codigoVendedor,
                getFilters(req.query)
            );

            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    /**
     * GET /dia/cumplimiento/front
     * Para admins - muestra las ventas diarias agregadas de todos los vendedores
     */
    async listFront(req, res) {
        try {
            const data = await cumplimientoDiaService.getCumplimientoDiaFront(getFilters(req.query));
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    /**
     * GET /dia/cumplimiento/vendedor/:codigoVendedor
     * Para obtener cumplimiento diario de un vendedor específico
     */
    async getByVendedor(req, res) {
        try {
            const data = await cumplimientoDiaService.getCumplimientoDiaVendedor(
                req.params.codigoVendedor,
                getFilters(req.query)
            );
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    /**
     * GET /dia/cumplimiento/supervisor/:idSupervisor
     * Para supervisores - muestra las ventas diarias agregadas de sus vendedores asignados
     */
    async getBySupervisor(req, res) {
        try {
            const data = await cumplimientoDiaService.getCumplimientoDiaSupervisor(
                Number(req.params.idSupervisor),
                getFilters(req.query)
            );
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
