const { ciudad_model } = require('../models');

const getAll = async () => ciudad_model.findAll();

const getById = async (id) => ciudad_model.findByPk(id);

const create = async (data) => ciudad_model.create(data);

const updateById = async (id, data) => {
    const ciudad = await ciudad_model.findByPk(id);
    if (!ciudad) return null;
    await ciudad.update(data);
    return ciudad;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
