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

module.exports = { getAll, getById, getByVendedor, getByCategoria, create, updateById, deleteById };
