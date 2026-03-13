const { item_model } = require('../models');

const getAll = async () => item_model.findAll();

const getById = async (id) => item_model.findByPk(id);

const create = async (data) => item_model.create(data);

const updateById = async (id, data) => {
    const item = await item_model.findByPk(id);
    if (!item) return null;
    await item.update(data);
    return item;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
