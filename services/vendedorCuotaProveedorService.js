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

module.exports = {
    getAll,
    getById,
    getByVendedor,
    getByProveedor,
    create,
    updateById
};