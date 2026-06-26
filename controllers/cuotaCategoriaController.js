const cuotaCategoriaService = require('../services/cuotaCategoria');
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

    // Pasar todos los filtros relevantes al service para que los
    // endpoints role-aware los honren (vendedor/proveedor/categoria/ciudad).
    const toArr = (val) => {
        if (val == null || val === '') return undefined;
        const raw = Array.isArray(val) ? val : String(val).split(',');
        const arr = raw.map((v) => String(v).trim()).filter(Boolean);
        return arr.length ? arr : undefined;
    };

    const vendedores = toArr(query.vendedor);
    const proveedores = toArr(query.proveedor);
    const categorias = toArr(query.categoria);
    const ciudades = toArr(query.ciudad);

    return {
        ...base,
        vendedor: vendedores ? vendedores.join(',') : undefined,
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
     * GET /cuota-categoria/general
     * Endpoint role-aware: filtra por rol desde el JWT.
     */
    async general(req, res) {
        try {
            const data = await cuotaCategoriaService.getCuotaCategoriaGeneral(
                getFilters(req.query),
                req.auth
            );
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async deleteById(req, res) {
        try {
            const result = await cuotaCategoriaService.deleteById(req.params.id);
            return res.status(200).send({ success: true, message: 'Cuota de categoría eliminada correctamente' });
        } catch (error) {
            return res.status(500).send({ error: error.message });
        }
    },

    async deleteByDateRange(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const result = await cuotaCategoriaService.deleteByDateRange(fechaInicio, fechaFin);
            return res.status(200).send(result);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    }
};
