const { Op } = require('sequelize');
const { rango_dias_model } = require('../models');
const { getResumenMesLaboral } = require('../utils/calendarioLaboralColombia');

const toNumber = (value) => Number(value || 0);

const getAll = async () => rango_dias_model.findAll();

const getById = async (id) => rango_dias_model.findByPk(id);

const create = async (data) => rango_dias_model.create(data);

const updateById = async (id, data) => {
    const rangoDias = await rango_dias_model.findByPk(id);
    if (!rangoDias) return null;
    await rangoDias.update(data);
    return rangoDias;
};

const upsertByRango = async (data) => {
    const existing = await rango_dias_model.findOne({
        where: {
            fecha_inicio: data.fecha_inicio,
            fecha_fin: data.fecha_fin
        }
    });

    if (existing) {
        await existing.update({
            dias_corridos: data.dias_corridos,
            dias_habiles: data.dias_habiles
        });
        return existing;
    }

    return rango_dias_model.create(data);
};

const syncMonth = async ({ year, month, fechaCorte } = {}) => {
    const now = new Date();
    const resolvedYear = Number(year) || now.getFullYear();
    const resolvedMonth = Number(month) || (now.getMonth() + 1);

    if (!Number.isInteger(resolvedYear) || resolvedYear < 1900 || resolvedYear > 3000) {
        throw new Error('Año inválido para sincronizar rango_dias.');
    }

    if (!Number.isInteger(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12) {
        throw new Error('Mes inválido para sincronizar rango_dias.');
    }

    const resumen = getResumenMesLaboral({
        year: resolvedYear,
        month: resolvedMonth,
        fechaCorte
    });

    const registro = await upsertByRango(resumen);

    return {
        year: resolvedYear,
        month: resolvedMonth,
        registro
    };
};

const syncYear = async ({ year, fechaCorte } = {}) => {
    const now = new Date();
    const resolvedYear = Number(year) || now.getFullYear();

    if (!Number.isInteger(resolvedYear) || resolvedYear < 1900 || resolvedYear > 3000) {
        throw new Error('Año inválido para sincronizar rango_dias.');
    }

    const resultado = [];
    for (let month = 1; month <= 12; month++) {
        const resumen = getResumenMesLaboral({
            year: resolvedYear,
            month,
            fechaCorte
        });

        const registro = await upsertByRango(resumen);
        resultado.push({
            month,
            registro
        });
    }

    return {
        year: resolvedYear,
        meses: resultado
    };
};

const getByPeriodo = async ({ fechaInicio, fechaFin }) => {
    const where = {};

    if (fechaInicio && fechaFin) {
        where.fecha_inicio = { [Op.lte]: fechaFin };
        where.fecha_fin = { [Op.gte]: fechaInicio };
    }

    return rango_dias_model.findOne({
        where,
        order: [['fecha_fin', 'DESC']]
    });
};

const getCurrentMonthHabiles = async () => {
    const { registro } = await syncMonth({
        fechaCorte: new Date()
    });

    return {
        fecha_inicio: registro.fecha_inicio,
        fecha_fin: registro.fecha_fin,
        dias_habiles: toNumber(registro.dias_habiles)
    };
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    syncMonth,
    syncYear,
    getByPeriodo,
    getCurrentMonthHabiles
};
