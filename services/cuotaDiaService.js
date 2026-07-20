const { Op } = require('sequelize');
const { cuotaDia_model, vendedor_model } = require('../models');

const getAll = async () => cuotaDia_model.findAll();

const getById = async (id) => cuotaDia_model.findByPk(id);

const create = async (data) => cuotaDia_model.create(data);

const deleteById = async (id) => {
    const cuotaDia = await cuotaDia_model.findByPk(id);
    if (!cuotaDia) return null;
    await vendedor_model.update({ id_cuotaDia: null }, { where: { id_cuotaDia: id } });
    await cuotaDia.destroy();
    return cuotaDia;
};

const deleteByUser = async (idUsuario, fechaInicio, fechaFin) => {
    const where = { id_usuario: Array.isArray(idUsuario) ? { [Op.in]: idUsuario } : idUsuario };

    if (fechaInicio && fechaFin) {
        where.fecha_inicio = { [Op.lte]: fechaFin };
        where.fecha_fin = { [Op.gte]: fechaInicio };
    }

    const registros = await cuotaDia_model.findAll({ where });
    if (!registros.length) return [];
    const ids = registros.map(r => r.id_cuotaDia);
    await vendedor_model.update(
        { id_cuotaDia: null },
        { where: { id_cuotaDia: ids } }
    );
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
