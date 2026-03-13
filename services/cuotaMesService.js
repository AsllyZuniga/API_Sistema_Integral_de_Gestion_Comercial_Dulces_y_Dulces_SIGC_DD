const { cuotaMes_model } = require('../models');

const getAll = async () => cuotaMes_model.findAll();

const getById = async (id) => cuotaMes_model.findByPk(id);

const create = async (data) => cuotaMes_model.create(data);

const updateById = async (id, data) => {
    const cuotaMes = await cuotaMes_model.findByPk(id);
    if (!cuotaMes) return null;
    await cuotaMes.update(data);
    return cuotaMes;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
