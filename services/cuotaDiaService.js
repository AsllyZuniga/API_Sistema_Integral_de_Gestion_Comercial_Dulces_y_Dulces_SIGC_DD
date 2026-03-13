const { cuotaDia_model } = require('../models');

const getAll = async () => cuotaDia_model.findAll();

const getById = async (id) => cuotaDia_model.findByPk(id);

const create = async (data) => cuotaDia_model.create(data);

const updateById = async (id, data) => {
    const cuotaDia = await cuotaDia_model.findByPk(id);
    if (!cuotaDia) return null;
    await cuotaDia.update(data);
    return cuotaDia;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
