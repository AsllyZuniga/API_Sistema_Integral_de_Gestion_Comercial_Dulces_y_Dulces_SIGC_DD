const { cliente_model } = require('../models');

const getAll = async () => cliente_model.findAll();

const getById = async (id) => cliente_model.findByPk(id);

const create = async (data) => cliente_model.create(data);

const updateById = async (id, data) => {
    const cliente = await cliente_model.findByPk(id);
    if (!cliente) return null;
    await cliente.update(data);
    return cliente;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
