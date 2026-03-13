const {
    vendedor_model,
    usuario_model,
    cuotaMes_model,
    cuotaSemana_model,
    cuotaDia_model
} = require('../models');

const includeRelations = [
    { model: usuario_model, as: 'usuario' },
    { model: cuotaMes_model, as: 'cuotaMes' },
    { model: cuotaSemana_model, as: 'cuotaSemana' },
    { model: cuotaDia_model, as: 'cuotaDia' }
];

const getAll = async () => vendedor_model.findAll({ include: includeRelations });

const getById = async (id) => vendedor_model.findByPk(id, { include: includeRelations });

const create = async (data) => vendedor_model.create(data);

const updateById = async (id, data) => {
    const vendedor = await vendedor_model.findByPk(id);
    if (!vendedor) return null;
    await vendedor.update(data);
    return vendedor;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
