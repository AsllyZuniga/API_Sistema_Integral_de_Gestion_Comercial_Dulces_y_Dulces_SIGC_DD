const models = require('../models');

// Obtener todas las cuotas de proveedor
async function getAll() {
    return await models.cuotaProveedor_model.findAll({
        include: [
            {
                model: models.VendedorCuotaProveedor,
                as: 'asignaciones',
                include: [
                    { model: models.vendedor_model, as: 'vendedor' },
                    { model: models.proveedor_model, as: 'proveedor' }
                ]
            }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.cuotaProveedor_model.findByPk(id, {
        include: [
            {
                model: models.VendedorCuotaProveedor,
                as: 'asignaciones',
                include: [
                    { model: models.vendedor_model, as: 'vendedor' },
                    { model: models.proveedor_model, as: 'proveedor' }
                ]
            }
        ]
    });
}

// Crear cuota de proveedor
async function create(data) {
    const { cuota, fecha_inicio, fecha_fin } = data;
    
    if (!cuota || !fecha_inicio || !fecha_fin) {
        throw new Error('Campos requeridos: cuota, fecha_inicio, fecha_fin');
    }

    const row = await models.cuotaProveedor_model.create({
        cuota,
        fecha_inicio,
        fecha_fin
    });
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.cuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Cuota de proveedor no encontrada');
    return await row.update(data);
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.cuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Cuota de proveedor no encontrada');
    return await row.destroy();
}

// Eliminar por rango de fechas
async function deleteByDateRange(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        throw new Error('Se requieren fechaInicio y fechaFin (YYYY-MM-DD)');
    }
    
    const { Op } = require('sequelize');
    
    // Convertir a ISO format para comparación correcta con BD
    const inicioISO = `${fechaInicio}T00:00:00.000Z`;
    const finISO = `${fechaFin}T23:59:59.999Z`;
    
    const deletedCount = await models.cuotaProveedor_model.destroy({
        where: {
            [Op.and]: [
                { fecha_inicio: { [Op.gte]: inicioISO } },
                { fecha_fin: { [Op.lte]: finISO } }
            ]
        }
    });
    
    return { deletedCount, message: `${deletedCount} cuotas de proveedor eliminadas` };
}

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    deleteById,
    deleteByDateRange
};
