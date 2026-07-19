const { Op } = require('sequelize');
const { cuotaDia_model } = require('../models');

const getAll = async () => cuotaDia_model.findAll();

const getById = async (id) => cuotaDia_model.findByPk(id);

const create = async (data) => cuotaDia_model.create(data);

const deleteById = async (id) => {
    const cuotaDia = await cuotaDia_model.findByPk(id);
    if (!cuotaDia) return null;
    await cuotaDia.destroy();
    return cuotaDia;
};

const deleteByUser = async (idUsuario, fechaInicio, fechaFin) => {
    const where = { id_usuario: idUsuario };

    if (fechaInicio && fechaFin) {
        where.fecha_inicio = { [Op.lte]: fechaFin };
        where.fecha_fin = { [Op.gte]: fechaInicio };
    }

    const registros = await cuotaDia_model.findAll({ where });
    if (!registros.length) return [];
    const ids = registros.map(r => r.id_cuotaDia);
    await cuotaDia_model.destroy({ where: { id_cuotaDia: ids } });
    return registros;
};

const updateById = async (id, data) => {
    const cuotaDia = await cuotaDia_model.findByPk(id);
    if (!cuotaDia) return null;
    await cuotaDia.update(data);
    return cuotaDia;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    deleteById,
    deleteByUser
};
