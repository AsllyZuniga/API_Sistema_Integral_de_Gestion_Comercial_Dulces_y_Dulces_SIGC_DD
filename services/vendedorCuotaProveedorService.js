const models = require('../models');

// Obtener todas las asignaciones con relaciones
async function getAll() {
    return await models.vendedorCuotaProveedor_model.findAll({
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.vendedorCuotaProveedor_model.findByPk(id, {
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un vendedor
async function getByVendedor(id_vendedor) {
    return await models.vendedorCuotaProveedor_model.findAll({
        where: { id_vendedor },
        include: [
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un proveedor
async function getByProveedor(id_proveedor) {
    return await models.vendedorCuotaProveedor_model.findAll({
        where: { id_proveedor },
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Crear asignación (upsert para evitar duplicados al cargar CSV)
async function create(data) {
    const { id_vendedor, id_proveedor, id_cuotaProveedor, estado = true } = data;
    const [row] = await models.vendedorCuotaProveedor_model.upsert(
        { id_vendedor, id_proveedor, id_cuotaProveedor, estado },
        { returning: true }
    );
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.vendedorCuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Asignación no encontrada');
    return await row.update(data);
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.vendedorCuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de proveedor no encontrada');
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
    
    // Primero encontrar los IDs que cumplen con el rango de fechas
    const recordsToDelete = await models.vendedorCuotaProveedor_model.findAll({
        where: {},
        include: [
            {
                model: models.cuotaProveedor_model,
                as: 'cuotaProveedor',
                where: {
                    [Op.and]: [
                        { fecha_inicio: { [Op.gte]: inicioISO } },
                        { fecha_fin: { [Op.lte]: finISO } }
                    ]
                },
                required: true
            }
        ],
        raw: true,
        attributes: ['id_vendedor_cuota_proveedor']
    });
    
    if (recordsToDelete.length === 0) {
        return { deletedCount: 0, message: '0 asignaciones de cuota de proveedor eliminadas' };
    }
    
    const idsToDelete = recordsToDelete.map(r => r.id_vendedor_cuota_proveedor);
    
    // Luego eliminar por los IDs encontrados
    const deletedCount = await models.vendedorCuotaProveedor_model.destroy({
        where: {
            id_vendedor_cuota_proveedor: { [Op.in]: idsToDelete }
        }
    });
    
    return { deletedCount, message: `${deletedCount} asignaciones de cuota de proveedor eliminadas` };
}

module.exports = {
    getAll,
    getById,
    getByVendedor,
    getByProveedor,
    create,
    updateById,
    deleteById,
    deleteByDateRange
};