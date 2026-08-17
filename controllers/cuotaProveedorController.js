const service = require('../services/cuotaProveedorService');

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
        if (!data) return res.status(404).json({ error: 'Cuota de proveedor no encontrada' });
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
        if ('id_proveedor' in req.body) {
            return res.status(400).json({
                success: false,
                error: 'No se permite cambiar el proveedor asignado',
                statusCode: 400
            });
        }

        const updateData = {};
        if (req.body.cuota !== undefined) updateData.cuota = req.body.cuota;
        if (req.body.fecha_inicio !== undefined) updateData.fecha_inicio = req.body.fecha_inicio;
        if (req.body.fecha_fin !== undefined) updateData.fecha_fin = req.body.fecha_fin;

        const data = await service.updateById(req.params.id, updateData);

        res.json({
            success: true,
            data,
            message: 'Cuota de proveedor actualizada correctamente'
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            statusCode
        });
    }
}

async function deleteById(req, res) {
    try {
        await service.deleteById(req.params.id);
        res.json({ success: true, message: 'Cuota de proveedor eliminada correctamente' });
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

module.exports = { getAll, getById, create, updateById, deleteById, deleteByDateRange };
