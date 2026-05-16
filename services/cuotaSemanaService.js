const { cuotaSemana_model } = require('../models');

const getAll = async () => cuotaSemana_model.findAll();

const getById = async (id) => cuotaSemana_model.findByPk(id);

const create = async (data) => cuotaSemana_model.create(data);

const updateById = async (id, data) => {
    const cuotaSemana = await cuotaSemana_model.findByPk(id);
    if (!cuotaSemana) return null;
    await cuotaSemana.update(data);
    return cuotaSemana;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
