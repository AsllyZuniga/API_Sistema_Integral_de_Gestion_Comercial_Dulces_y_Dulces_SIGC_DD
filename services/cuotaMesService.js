const { cuotaMes_model } = require('../models');

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

const updateById = async (id, data) => {
    const cuotaMes = await cuotaMes_model.findByPk(id);
    if (!cuotaMes) return null;

    const dataToUpdate = { ...data };

    // Si se actualiza el mes, regenerar fechas
    if (data.mes !== undefined) {
        let monthIndex;

        if (typeof data.mes === 'string') {
            monthIndex = detectMonth(data.mes);
            if (monthIndex === null) {
                throw new Error(`Mes inválido: "${data.mes}"`);
            }
        } else if (typeof data.mes === 'number') {
            monthIndex = data.mes;
            if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
                throw new Error(`Mes debe ser un número entre 0 y 11`);
            }
        }

        const year = getCurrentYear(data.year);
        dataToUpdate.fecha_inicio = formatDate(year, monthIndex, 1);
        dataToUpdate.fecha_fin = formatDate(year, monthIndex, getLastDayOfMonth(year, monthIndex));

        delete dataToUpdate.mes;
        delete dataToUpdate.year;
    }

    await cuotaMes.update(dataToUpdate);
    return cuotaMes;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    detectMonth,
    formatDate,
    getLastDayOfMonth,
    getCurrentYear
};
