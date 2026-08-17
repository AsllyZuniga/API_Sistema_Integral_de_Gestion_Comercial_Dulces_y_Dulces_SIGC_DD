const models = require('../models');

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

// Obtener todas las cuotas de proveedor
async function getAll() {
    return await models.cuotaProveedor_model.findAll({
        include: [
            {
                model: models.VendedorCuotaProveedor,
                as: 'asignaciones',
                include: [
                    { model: models.vendedor_model, as: 'vendedor' },
                    { model: models.proveedor_model, as: 'proveedor' }
                ]
            }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.cuotaProveedor_model.findByPk(id, {
        include: [
            {
                model: models.VendedorCuotaProveedor,
                as: 'asignaciones',
                include: [
                    { model: models.vendedor_model, as: 'vendedor' },
                    { model: models.proveedor_model, as: 'proveedor' }
                ]
            }
        ]
    });
}

// Crear cuota de proveedor
async function create(data) {
    const { cuota, fecha_inicio, fecha_fin } = data;
    
    if (!cuota || !fecha_inicio || !fecha_fin) {
        throw new Error('Campos requeridos: cuota, fecha_inicio, fecha_fin');
    }

    const row = await models.cuotaProveedor_model.create({
        cuota,
        fecha_inicio,
        fecha_fin
    });
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.cuotaProveedor_model.findByPk(id);
    if (!row) throw new NotFoundError('Cuota de proveedor no encontrada');

    if ('id_proveedor' in data) {
        throw new ValidationError('No se permite cambiar el proveedor asignado');
    }

    if (Object.keys(data).length === 0) {
        throw new ValidationError('No se recibieron campos para actualizar');
    }

    const dataToUpdate = {};

    if (data.cuota !== undefined) {
        const cuotaNum = Number(data.cuota);
        if (Number.isNaN(cuotaNum)) {
            throw new ValidationError('La cuota debe ser un valor numérico');
        }
        if (cuotaNum < 0) {
            throw new ValidationError('La cuota no puede ser negativa');
        }
        dataToUpdate.cuota = cuotaNum;
    }

    if (data.fecha_inicio !== undefined) {
        if (!isValidDateString(data.fecha_inicio)) {
            throw new ValidationError('La fecha de inicio debe tener formato YYYY-MM-DD y ser una fecha válida');
        }
        dataToUpdate.fecha_inicio = data.fecha_inicio;
    }

    if (data.fecha_fin !== undefined) {
        if (!isValidDateString(data.fecha_fin)) {
            throw new ValidationError('La fecha de fin debe tener formato YYYY-MM-DD y ser una fecha válida');
        }
        dataToUpdate.fecha_fin = data.fecha_fin;
    }

    const fechaInicioFinal = dataToUpdate.fecha_inicio || row.fecha_inicio;
    const fechaFinFinal = dataToUpdate.fecha_fin || row.fecha_fin;

    const inicio = new Date(fechaInicioFinal);
    const fin = new Date(fechaFinFinal);

    if (inicio > fin) {
        throw new ValidationError('La fecha de inicio no puede ser mayor que la fecha de fin');
    }

    return await row.update(dataToUpdate);
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.cuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Cuota de proveedor no encontrada');
    return await row.destroy();
}

// Eliminar por rango de fechas
async function deleteByDateRange(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        throw new Error('Se requieren fechaInicio y fechaFin (YYYY-MM-DD)');
    }
    
    const { Op } = require('sequelize');
    
    // Convertir a ISO format para comparación correcta con BD
    const inicioISO = `${fechaInicio}T00:00:00.000Z`;
    const finISO = `${fechaFin}T23:59:59.999Z`;
    
    const deletedCount = await models.cuotaProveedor_model.destroy({
        where: {
            [Op.and]: [
                { fecha_inicio: { [Op.gte]: inicioISO } },
                { fecha_fin: { [Op.lte]: finISO } }
            ]
        }
    });
    
    return { deletedCount, message: `${deletedCount} cuotas de proveedor eliminadas` };
}

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    deleteById,
    deleteByDateRange
};
