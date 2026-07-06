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

const toArr = (raw) => {
    if (raw == null || raw === '') return [];
    const list = Array.isArray(raw) ? raw : String(raw).split(',');
    return [...new Set(list.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean))];
};

const getFilters = (query) => {
    const filters = {
        fechaInicio: query.fechaInicio,
        fechaFin: query.fechaFin,
        vendedor: query.vendedor
    };

    const vendedorRaw = query.vendedor || query.codVendedor;
    if (vendedorRaw) {
        filters.vendedores = toArr(vendedorRaw);
        filters.vendedor = filters.vendedores[0];
    }

    const proveedorRaw = query.proveedor || query.codProveedor;
    if (proveedorRaw) {
        filters.proveedores = toArr(proveedorRaw);
        filters.proveedor = filters.proveedores[0];
    }

    const categoriaRaw = query.categoria || query.codCategoria;
    if (categoriaRaw) {
        const raw = Array.isArray(categoriaRaw) ? categoriaRaw : String(categoriaRaw).split(',');
        const list = raw.flatMap(v => String(v).split(',').map(s => extractCategoryId(s.trim()))).filter(Boolean);
        filters.categorias = [...new Set(list)];
    }

    const ciudadRaw = query.ciudad || query.codCiudad;
    if (ciudadRaw) {
        filters.ciudades = toArr(ciudadRaw);
        filters.ciudad = filters.ciudades[0];
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
     * Para admins - cuota diaria por vendedor (agregada en el rango de fechas)
     */
    async listFront(req, res) {
        try {
            const data = await cumplimientoDiaService.getCumplimientoDiaVendedores(getFilters(req.query));
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
     * GET /api/dia/cumplimiento/vendedores
     * Para admins - cuota diaria agregada por vendedor en rango de fechas
     */
    async listFrontVendedores(req, res) {
        try {
            const data = await cumplimientoDiaService.getCumplimientoDiaVendedores(getFilters(req.query));
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
