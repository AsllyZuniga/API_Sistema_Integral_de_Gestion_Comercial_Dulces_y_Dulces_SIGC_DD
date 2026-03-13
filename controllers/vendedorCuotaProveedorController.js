const service       = require('../services/vendedorCuotaProveedorService');
const importService = require('../services/importCuotaProveedorService');
const multer        = require('multer');

const upload          = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadMiddleware = upload.single('file');

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

async function getByProveedor(req, res) {
    try {
        const data = await service.getByProveedor(req.params.id_proveedor);
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

function uploadCSV(req, res) {
    uploadMiddleware(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo CSV (campo "file").' });
        const { fecha_inicio, fecha_fin } = req.body;
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin (YYYY-MM-DD).' });
        }
        try {
            const resumen = await importService.importFromBuffer(req.file.buffer, fecha_inicio, fecha_fin);
            res.json({ ok: true, resumen });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { getAll, getById, getByVendedor, getByProveedor, create, updateById, uploadCSV };