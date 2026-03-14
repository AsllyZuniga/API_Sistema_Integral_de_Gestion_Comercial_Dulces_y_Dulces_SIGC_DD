const { subcanal_model } = require('../models');

const getAll = async () => subcanal_model.findAll();

const getById = async (id) => subcanal_model.findByPk(id);

const create = async (data) => subcanal_model.create(data);

const updateById = async (id, data) => {
    const subcanal = await subcanal_model.findByPk(id);
    if (!subcanal) return null;
    await subcanal.update(data);
    return subcanal;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
