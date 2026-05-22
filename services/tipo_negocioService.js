const { tipo_negocio_model } = require('../models');

const getAll = async () => tipo_negocio_model.findAll();

const getById = async (id) => tipo_negocio_model.findByPk(id);

const create = async (data) => tipo_negocio_model.create(data);

const updateById = async (id, data) => {
    const tipoNegocio = await tipo_negocio_model.findByPk(id);
    if (!tipoNegocio) return null;
    await tipoNegocio.update(data);
    return tipoNegocio;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
