const { barrio_model } = require('../models');

const getAll = async () => barrio_model.findAll();

const getById = async (id) => barrio_model.findByPk(id);

const create = async (data) => barrio_model.create(data);

const updateById = async (id, data) => {
    const barrio = await barrio_model.findByPk(id);
    if (!barrio) return null;
    await barrio.update(data);
    return barrio;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
