const { Op } = require('sequelize');
const { cuotaSemana_model } = require('../models');

const getAll = async () => cuotaSemana_model.findAll();

const getById = async (id) => cuotaSemana_model.findByPk(id);

const create = async (data) => cuotaSemana_model.create(data);

const deleteById = async (id) => {
    const cuotaSemana = await cuotaSemana_model.findByPk(id);
    if (!cuotaSemana) return null;
    await cuotaSemana.destroy();
    return cuotaSemana;
};

const deleteByUser = async (idUsuario, fechaInicio, fechaFin) => {
    const where = { id_usuario: Array.isArray(idUsuario) ? { [Op.in]: idUsuario } : idUsuario };

    if (fechaInicio && fechaFin) {
        where.fecha_inicio = { [Op.lte]: fechaFin };
        where.fecha_fin = { [Op.gte]: fechaInicio };
    }

    const registros = await cuotaSemana_model.findAll({ where });
    if (!registros.length) return [];
    const ids = registros.map(r => r.id_cuotaSemana);
    await cuotaSemana_model.destroy({ where: { id_cuotaSemana: ids } });
    return registros;
};

const updateById = async (id, data) => {
    const cuotaSemana = await cuotaSemana_model.findByPk(id);
    if (!cuotaSemana) return null;
    await cuotaSemana.update(data);
    return cuotaSemana;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    deleteById,
    deleteByUser
};
