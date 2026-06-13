const { tipo_documento_model } = require('../models');

const getAll = async () => tipo_documento_model.findAll();

const getById = async (id) => tipo_documento_model.findByPk(id);

const create = async (data) => tipo_documento_model.create(data);

const updateById = async (id, data) => {
    const tipoDocumento = await tipo_documento_model.findByPk(id);
    if (!tipoDocumento) return null;
    await tipoDocumento.update(data);
    return tipoDocumento;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
