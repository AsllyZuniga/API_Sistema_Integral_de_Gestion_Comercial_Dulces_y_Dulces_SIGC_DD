const { Op } = require('sequelize');
const { cuotaMes_model, vendedor_model } = require('../models');

/**
 * Obtiene el mes de un string (ej: "abril" -> 3)
 */
function detectMonth(monthStr) {
    const MONTH_MAP = {
        enero: 0, febrero: 1, marzo: 2, abril: 3,
        mayo: 4, junio: 5, julio: 6, agosto: 7,
        septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3,
        'may': 4, 'jun': 5, 'jul': 6, 'ago': 7,
        'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    };

    if (!monthStr) return null;
    const normalized = String(monthStr).toLowerCase().trim();
    return MONTH_MAP[normalized];
}

/**
 * Calcula el último día del mes
 */
function getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Formatea una fecha a ISO string (YYYY-MM-DD)
 */
function formatDate(year, month, day) {
    return new Date(year, month, day).toISOString().split('T')[0];
}

/**
 * Obtiene el año actual o el especificado
 */
function getCurrentYear(optionalYear) {
    if (optionalYear && Number.isInteger(Number(optionalYear)) && optionalYear > 1900) {
        return Number(optionalYear);
    }
    return new Date().getFullYear();
}

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

const getAll = async () => cuotaMes_model.findAll();

const getById = async (id) => cuotaMes_model.findByPk(id);

/**
 * Crea una cuota mensual con detección automática de mes
 * @param {Object} data - Datos de la cuota
 * @param {number} data.cuota_mes - Monto de la cuota mensual
 * @param {number} data.id_usuario - ID del usuario
 * @param {string|number} [data.mes] - Mes (nombre o número 0-11), si no se proporciona usa el mes actual
 * @param {number} [data.year] - Año (si no se proporciona usa el año actual)
 * @param {string} [data.fecha_inicio] - Fecha de inicio (si no se proporciona se genera automáticamente)
 * @param {string} [data.fecha_fin] - Fecha de fin (si no se proporciona se genera automáticamente)
 * @returns {Promise<Object>} Registro creado
 */
const create = async (data) => {
    const dataToCreate = { ...data };

    // Si se proporciona mes, detectar y generar fechas automáticamente
    if (data.mes !== undefined || !data.fecha_inicio) {
        let monthIndex;

        if (typeof data.mes === 'string') {
            // Si es un string, detectar el mes
            monthIndex = detectMonth(data.mes);
            if (monthIndex === null) {
                throw new Error(`Mes inválido: "${data.mes}". Usa nombres en español (ej: "abril", "marzo")`);
            }
        } else if (typeof data.mes === 'number') {
            // Si es un número, validar que esté en rango 0-11
            monthIndex = data.mes;
            if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
                throw new Error(`Mes debe ser un número entre 0 (enero) y 11 (diciembre)`);
            }
        } else {
            // Si no se proporciona mes, usar el mes actual
            const now = new Date();
            monthIndex = now.getMonth();
        }

        const year = getCurrentYear(data.year);

        // Generar fechas automáticamente
        dataToCreate.fecha_inicio = formatDate(year, monthIndex, 1);
        dataToCreate.fecha_fin = formatDate(year, monthIndex, getLastDayOfMonth(year, monthIndex));

        // Limpiar propiedades innecesarias
        delete dataToCreate.mes;
        delete dataToCreate.year;
    }

    return cuotaMes_model.create(dataToCreate);
};

const deleteById = async (id) => {
    const cuotaMes = await cuotaMes_model.findByPk(id);
    if (!cuotaMes) return null;
    await vendedor_model.update({ id_cuotaMes: null }, { where: { id_cuotaMes: id } });
    await cuotaMes.destroy();
    return cuotaMes;
};

/**
 * Elimina las cuotas mensuales de uno o varios usuarios (idUsuario puede
 * ser un id único o un array de ids).
 * Si se pasa fechaInicio/fechaFin, solo elimina las cuotas cuyo periodo
 * (fecha_inicio–fecha_fin) se solape con ese rango; sin rango, elimina todas.
 */
const deleteByUser = async (idUsuario, fechaInicio, fechaFin) => {
    const where = { id_usuario: Array.isArray(idUsuario) ? { [Op.in]: idUsuario } : idUsuario };

    if (fechaInicio && fechaFin) {
        where.fecha_inicio = { [Op.lte]: fechaFin };
        where.fecha_fin = { [Op.gte]: fechaInicio };
    }

    const registros = await cuotaMes_model.findAll({ where });
    if (!registros.length) return [];
    const ids = registros.map(r => r.id_cuotaMes);
    // Limpiar el FK del vendedor si su cuota vigente está entre las que se
    // van a borrar; si no, PostgreSQL rechaza el destroy por la FK.
    await vendedor_model.update(
        { id_cuotaMes: null },
        { where: { id_cuotaMes: ids } }
    );
    await cuotaMes_model.destroy({ where: { id_cuotaMes: ids } });
    return registros;
};

const updateById = async (id, data) => {
    const cuotaMes = await cuotaMes_model.findByPk(id);
    if (!cuotaMes) {
        throw new NotFoundError('Cuota mensual no encontrada');
    }

    if (!data || Object.keys(data).length === 0) {
        throw new ValidationError('No se enviaron campos para actualizar');
    }

    if (data.id_usuario !== undefined) {
        throw new ValidationError('No se permite cambiar el usuario asignado a la cuota');
    }

    const dataToUpdate = { ...data };

    // Validar cuota_mes
    if (dataToUpdate.cuota_mes !== undefined) {
        const cuotaValue = Number(dataToUpdate.cuota_mes);
        if (!Number.isFinite(cuotaValue) || !Number.isInteger(cuotaValue) || cuotaValue < 0) {
            throw new ValidationError('cuota_mes debe ser un número entero mayor o igual a 0');
        }
        dataToUpdate.cuota_mes = cuotaValue;
    }

    // Si se actualiza el mes, regenerar fechas y descartar fechas explícitas
    if (dataToUpdate.mes !== undefined) {
        let monthIndex;

        if (typeof dataToUpdate.mes === 'string') {
            monthIndex = detectMonth(dataToUpdate.mes);
            if (monthIndex === null) {
                throw new ValidationError(`Mes inválido: "${dataToUpdate.mes}"`);
            }
        } else if (typeof dataToUpdate.mes === 'number') {
            monthIndex = dataToUpdate.mes;
            if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
                throw new ValidationError('Mes debe ser un número entre 0 (enero) y 11 (diciembre)');
            }
        } else {
            throw new ValidationError('mes debe ser un nombre o número de mes válido');
        }

        const year = getCurrentYear(dataToUpdate.year);
        dataToUpdate.fecha_inicio = formatDate(year, monthIndex, 1);
        dataToUpdate.fecha_fin = formatDate(year, monthIndex, getLastDayOfMonth(year, monthIndex));

        delete dataToUpdate.mes;
        delete dataToUpdate.year;
    }

    // Validar rango de fechas (regenerado o explícito)
    if (dataToUpdate.fecha_inicio !== undefined || dataToUpdate.fecha_fin !== undefined) {
        const fechaInicio = dataToUpdate.fecha_inicio ?? cuotaMes.fecha_inicio;
        const fechaFin = dataToUpdate.fecha_fin ?? cuotaMes.fecha_fin;

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
    const fechaInicioFinal = dataToUpdate.fecha_inicio ?? cuotaMes.fecha_inicio;
    const fechaFinFinal = dataToUpdate.fecha_fin ?? cuotaMes.fecha_fin;
    const periodoCambio = fechaInicioFinal !== cuotaMes.fecha_inicio || fechaFinFinal !== cuotaMes.fecha_fin;

    if (periodoCambio) {
        const duplicada = await cuotaMes_model.findOne({
            where: {
                id_usuario: cuotaMes.id_usuario,
                fecha_inicio: fechaInicioFinal,
                fecha_fin: fechaFinFinal,
                id_cuotaMes: { [Op.ne]: id }
            }
        });

        if (duplicada) {
            throw new ConflictError('Ya existe otra cuota mensual para el mismo usuario en el mismo período');
        }
    }

    await cuotaMes.update(dataToUpdate);
    return cuotaMes;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    deleteById,
    deleteByUser,
    detectMonth,
    formatDate,
    getLastDayOfMonth,
    getCurrentYear
};
