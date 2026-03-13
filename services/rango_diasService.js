const { rango_dias_model } = require('../models');

const getAll = async () => rango_dias_model.findAll();

const getById = async (id) => rango_dias_model.findByPk(id);

const create = async (data) => rango_dias_model.create(data);

const updateById = async (id, data) => {
    const rangoDias = await rango_dias_model.findByPk(id);
    if (!rangoDias) return null;
    await rangoDias.update(data);
    return rangoDias;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
