const models = require('../models');

// Obtener todas las asignaciones con relaciones
async function getAll() {
    return await models.VendedorCuotaProveedor.findAll({
        include: [
            { model: models.Vendedor,       as: 'vendedor'       },
            { model: models.Proveedor,      as: 'proveedor'      },
            { model: models.CuotaProveedor, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.VendedorCuotaProveedor.findByPk(id, {
        include: [
            { model: models.Vendedor,       as: 'vendedor'       },
            { model: models.Proveedor,      as: 'proveedor'      },
            { model: models.CuotaProveedor, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un vendedor
async function getByVendedor(id_vendedor) {
    return await models.VendedorCuotaProveedor.findAll({
        where: { id_vendedor },
        include: [
            { model: models.Proveedor,      as: 'proveedor'      },
            { model: models.CuotaProveedor, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un proveedor
async function getByProveedor(id_proveedor) {
    return await models.VendedorCuotaProveedor.findAll({
        where: { id_proveedor },
        include: [
            { model: models.Vendedor,       as: 'vendedor'       },
            { model: models.CuotaProveedor, as: 'cuotaProveedor' }
        ]
    });
}

// Crear asignación (upsert para evitar duplicados al cargar CSV)
async function create(data) {
    const { id_vendedor, id_proveedor, id_cuotaProveedor, estado = true } = data;
    const [row] = await models.VendedorCuotaProveedor.upsert(
        { id_vendedor, id_proveedor, id_cuotaProveedor, estado },
        { returning: true }
    );
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.VendedorCuotaProveedor.findByPk(id);
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