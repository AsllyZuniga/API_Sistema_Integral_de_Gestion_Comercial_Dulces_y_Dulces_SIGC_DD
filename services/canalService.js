const { canal_model } = require('../models');

const getAll = async () => canal_model.findAll();

const getById = async (id) => canal_model.findByPk(id);

const create = async (data) => canal_model.create(data);

const updateById = async (id, data) => {
    const canal = await canal_model.findByPk(id);
    if (!canal) return null;
    await canal.update(data);
    return canal;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
