const { megacategoria_model } = require('../models');

const getAll = async () => megacategoria_model.findAll();

const getById = async (id) => megacategoria_model.findByPk(id);

const create = async (data) => megacategoria_model.create(data);

const updateById = async (id, data) => {
    const megacategoria = await megacategoria_model.findByPk(id);
    if (!megacategoria) return null;
    await megacategoria.update(data);
    return megacategoria;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
