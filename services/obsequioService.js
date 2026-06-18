const { obsequio_model } = require('../models');

const getAll = async () => obsequio_model.findAll();

const getById = async (id) => obsequio_model.findByPk(id);

const create = async (data) => obsequio_model.create(data);

const updateById = async (id, data) => {
    const obsequio = await obsequio_model.findByPk(id);
    if (!obsequio) return null;
    await obsequio.update(data);
    return obsequio;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
