const { proveedor_model } = require('../models');

const getAll = async () => proveedor_model.findAll();

const getById = async (id) => proveedor_model.findByPk(id);

const create = async (data) => proveedor_model.create(data);

const updateById = async (id, data) => {
    const proveedor = await proveedor_model.findByPk(id);
    if (!proveedor) return null;
    await proveedor.update(data);
    return proveedor;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
