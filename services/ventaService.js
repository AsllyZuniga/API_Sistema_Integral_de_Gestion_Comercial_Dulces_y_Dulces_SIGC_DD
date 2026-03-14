const { venta_model } = require('../models');

const getAll = async () => venta_model.findAll();

const getById = async (id) => venta_model.findByPk(id);

const create = async (data) => venta_model.create(data);

const updateById = async (id, data) => {
    const venta = await venta_model.findByPk(id);
    if (!venta) return null;
    await venta.update(data);
    return venta;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
