const { subcategoria_model } = require('../models');

const getAll = async () => subcategoria_model.findAll();

const getById = async (id) => subcategoria_model.findByPk(id);

const create = async (data) => subcategoria_model.create(data);

const updateById = async (id, data) => {
    const subcategoria = await subcategoria_model.findByPk(id);
    if (!subcategoria) return null;
    await subcategoria.update(data);
    return subcategoria;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
