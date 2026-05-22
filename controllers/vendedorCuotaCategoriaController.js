const service = require('../services/vendedorCuotaCategoriaService');

async function getAll(req, res) {
    try {
        const data = await service.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getById(req, res) {
    try {
        const data = await service.getById(req.params.id);
        if (!data) return res.status(404).json({ error: 'No encontrado' });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getByVendedor(req, res) {
    try {
        const data = await service.getByVendedor(req.params.id_vendedor);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getByCategoria(req, res) {
    try {
        const data = await service.getByCategoria(req.params.id_categoria);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function create(req, res) {
    try {
        const data = await service.create(req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateById(req, res) {
    try {
        const data = await service.updateById(req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteById(req, res) {
    try {
        const result = await service.deleteById(req.params.id);
        res.json({ success: true, message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteByDateRange(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const result = await service.deleteByDateRange(fechaInicio, fechaFin);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getByDateRange(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const result = await service.getByDateRange(fechaInicio, fechaFin);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getAllWithDates(req, res) {
    try {
        const result = await service.getAllWithDates();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function debugDates(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const result = await service.debugDates(fechaInicio, fechaFin);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = { getAll, getById, getByVendedor, getByCategoria, create, updateById, deleteById, deleteByDateRange, getByDateRange, getAllWithDates, debugDates };
