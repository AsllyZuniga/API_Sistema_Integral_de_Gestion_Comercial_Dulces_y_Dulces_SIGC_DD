const { Op } = require('sequelize');
const { cuotaSemana_model, vendedor_model } = require('../models');

/**
 * Valida que un valor sea una fecha en formato YYYY-MM-DD y que represente
 * una fecha real del calendario.
 */
function isValidDateString(value) {
    if (!value || typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 404;
    }
}

class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 409;
    }
}

const getAll = async () => cuotaSemana_model.findAll();

const getById = async (id) => cuotaSemana_model.findByPk(id);

const create = async (data) => cuotaSemana_model.create(data);

const deleteById = async (id) => {
    const cuotaSemana = await cuotaSemana_model.findByPk(id);
    if (!cuotaSemana) return null;
    await vendedor_model.update({ id_cuotaSemana: null }, { where: { id_cuotaSemana: id } });
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
    await vendedor_model.update(
        { id_cuotaSemana: null },
        { where: { id_cuotaSemana: ids } }
    );
    await cuotaSemana_model.destroy({ where: { id_cuotaSemana: ids } });
    return registros;
};

const updateById = async (id, data) => {
    const cuotaSemana = await cuotaSemana_model.findByPk(id);
    if (!cuotaSemana) {
        throw new NotFoundError('Cuota semanal no encontrada');
    }

    if (!data || Object.keys(data).length === 0) {
        throw new ValidationError('No se enviaron campos para actualizar');
    }

    if (data.id_usuario !== undefined) {
        throw new ValidationError('No se permite cambiar el usuario asignado a la cuota');
    }

    const dataToUpdate = { ...data };

    // Validar cuota_semana
    if (dataToUpdate.cuota_semana !== undefined) {
        const cuotaValue = Number(dataToUpdate.cuota_semana);
        if (!Number.isFinite(cuotaValue) || !Number.isInteger(cuotaValue) || cuotaValue < 0) {
            throw new ValidationError('cuota_semana debe ser un número entero mayor o igual a 0');
        }
        dataToUpdate.cuota_semana = cuotaValue;
    }

    // Validar rango de fechas
    if (dataToUpdate.fecha_inicio !== undefined || dataToUpdate.fecha_fin !== undefined) {
        const fechaInicio = dataToUpdate.fecha_inicio ?? cuotaSemana.fecha_inicio;
        const fechaFin = dataToUpdate.fecha_fin ?? cuotaSemana.fecha_fin;

        if (!isValidDateString(fechaInicio) || !isValidDateString(fechaFin)) {
            throw new ValidationError('fecha_inicio y fecha_fin deben tener formato YYYY-MM-DD válido');
        }

        if (fechaInicio > fechaFin) {
            throw new ValidationError('fecha_inicio no puede ser mayor que fecha_fin');
        }

        dataToUpdate.fecha_inicio = fechaInicio;
        dataToUpdate.fecha_fin = fechaFin;
    }

    // Evitar duplicados cuando cambia el período (no hay unique en BD)
    const fechaInicioFinal = dataToUpdate.fecha_inicio ?? cuotaSemana.fecha_inicio;
    const fechaFinFinal = dataToUpdate.fecha_fin ?? cuotaSemana.fecha_fin;
    const periodoCambio = fechaInicioFinal !== cuotaSemana.fecha_inicio || fechaFinFinal !== cuotaSemana.fecha_fin;

    if (periodoCambio) {
        const duplicada = await cuotaSemana_model.findOne({
            where: {
                id_usuario: cuotaSemana.id_usuario,
                fecha_inicio: fechaInicioFinal,
                fecha_fin: fechaFinFinal,
                id_cuotaSemana: { [Op.ne]: id }
            }
        });

        if (duplicada) {
            throw new ConflictError('Ya existe otra cuota semanal para el mismo usuario en el mismo período');
        }
    }

    await cuotaSemana.update(dataToUpdate);
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
