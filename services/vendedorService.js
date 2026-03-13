const { vendedor_model } = require('../models');

const getAll = async () => vendedor_model.findAll();

const getById = async (id) => vendedor_model.findByPk(id);

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
