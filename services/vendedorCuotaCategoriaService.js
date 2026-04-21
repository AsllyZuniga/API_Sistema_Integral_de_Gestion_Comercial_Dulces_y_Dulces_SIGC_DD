const models = require('../models');

// Obtener todas las asignaciones con relaciones
async function getAll() {
    return await models.vendedorCuotaCategoria_model.findAll({
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.vendedorCuotaCategoria_model.findByPk(id, {
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener todas las cuotas de categoría de un vendedor
async function getByVendedor(id_vendedor) {
    return await models.vendedorCuotaCategoria_model.findAll({
        where: { id_vendedor },
        include: [
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener todos los vendedores asignados a una categoría
async function getByCategoria(id_categoria) {
    return await models.vendedorCuotaCategoria_model.findAll({
        where: { id_categoria },
        include: [
            { model: models.vendedor_model, as: 'vendedor' }
        ]
    });
}

// Crear asignación (upsert para evitar duplicados)
async function create(data) {
    const { id_vendedor, id_categoria, cuota = 0, fecha_inicio, fecha_fin } = data;

    // Validar que existan el vendedor y la categoría
    const vendedor = await models.vendedor_model.findByPk(id_vendedor);
    if (!vendedor) throw new Error('Vendedor no encontrado');

    const categoria = await models.categoria_model.findByPk(id_categoria);
    if (!categoria) throw new Error('Categoría no encontrada');

    const [row] = await models.vendedorCuotaCategoria_model.upsert(
        { id_vendedor, id_categoria, cuota, fecha_inicio, fecha_fin },
        { returning: true }
    );
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.vendedorCuotaCategoria_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de categoría no encontrada');
    return await row.update(data);
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.vendedorCuotaCategoria_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de categoría no encontrada');
    return await row.destroy();
}

module.exports = {
    getAll,
    getById,
    getByVendedor,
    getByCategoria,
    create,
    updateById,
    deleteById
};
