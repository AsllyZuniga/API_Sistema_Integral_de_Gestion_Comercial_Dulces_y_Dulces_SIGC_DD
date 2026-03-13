const { categoria_model } = require('../models');

const getAll = async () => categoria_model.findAll();

const getById = async (id) => categoria_model.findByPk(id);

const create = async (data) => categoria_model.create(data);

const updateById = async (id, data) => {
    const categoria = await categoria_model.findByPk(id);
    if (!categoria) return null;
    await categoria.update(data);
    return categoria;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
