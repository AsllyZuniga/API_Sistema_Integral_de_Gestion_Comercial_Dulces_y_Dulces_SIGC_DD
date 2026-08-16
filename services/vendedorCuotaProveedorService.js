const models = require('../models');

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

// Obtener todas las asignaciones con relaciones
async function getAll() {
    return await models.vendedorCuotaProveedor_model.findAll({
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.vendedorCuotaProveedor_model.findByPk(id, {
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un vendedor
async function getByVendedor(id_vendedor) {
    return await models.vendedorCuotaProveedor_model.findAll({
        where: { id_vendedor },
        include: [
            { model: models.proveedor_model,      as: 'proveedor'      },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Obtener todas las cuotas de un proveedor
async function getByProveedor(id_proveedor) {
    return await models.vendedorCuotaProveedor_model.findAll({
        where: { id_proveedor },
        include: [
            { model: models.vendedor_model,       as: 'vendedor'       },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });
}

// Crear asignación (upsert para evitar duplicados al cargar CSV)
async function create(data) {
    const { id_vendedor, id_proveedor, id_cuotaProveedor, estado = true } = data;
    const [row] = await models.vendedorCuotaProveedor_model.upsert(
        { id_vendedor, id_proveedor, id_cuotaProveedor, estado },
        { returning: true }
    );
    return row;
}

// Actualizar por id
// NOTA: este endpoint no edita la asignación (id_vendedor/id_proveedor/id_cuotaProveedor).
// Edita el VALOR de la cuotaProveedor vinculada a esa asignación, ya que cada
// asignación tiene su propia fila de cuota (1:1), por lo que el cambio solo afecta
// a ese vendedor + proveedor + período.
async function updateById(id, data) {
    const row = await models.vendedorCuotaProveedor_model.findByPk(id, {
        include: [
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });

    if (!row) throw new NotFoundError('Asignación de cuota de proveedor no encontrada');
    if (!row.cuotaProveedor) {
        throw new NotFoundError('Cuota de proveedor vinculada a la asignación no encontrada');
    }

    if (Object.keys(data).length === 0) {
        throw new ValidationError('No se recibieron campos para actualizar');
    }

    const blockedFields = ['id_vendedor', 'id_proveedor', 'id_cuotaProveedor', 'fecha_inicio', 'fecha_fin'];
    for (const field of blockedFields) {
        if (field in data) {
            throw new ValidationError(`No se permite modificar ${field} de la asignación`);
        }
    }

    if (data.cuota === undefined) {
        throw new ValidationError('Solo se permite actualizar el campo cuota');
    }

    const cuotaNum = Number(data.cuota);
    if (Number.isNaN(cuotaNum)) {
        throw new ValidationError('La cuota debe ser un valor numérico');
    }
    if (cuotaNum < 0) {
        throw new ValidationError('La cuota no puede ser negativa');
    }

    await row.cuotaProveedor.update({ cuota: cuotaNum });

    // Recargar la asignación con sus relaciones para devolver el valor actualizado
    const updated = await models.vendedorCuotaProveedor_model.findByPk(id, {
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.proveedor_model, as: 'proveedor' },
            { model: models.cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    });

    return updated;
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.vendedorCuotaProveedor_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de proveedor no encontrada');
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
    
    // Primero encontrar los IDs que cumplen con el rango de fechas
    const recordsToDelete = await models.vendedorCuotaProveedor_model.findAll({
        where: {},
        include: [
            {
                model: models.cuotaProveedor_model,
                as: 'cuotaProveedor',
                where: {
                    [Op.and]: [
                        { fecha_inicio: { [Op.gte]: inicioISO } },
                        { fecha_fin: { [Op.lte]: finISO } }
                    ]
                },
                required: true
            }
        ],
        raw: true,
        attributes: ['id_vendedor_cuota_proveedor']
    });
    
    if (recordsToDelete.length === 0) {
        return { deletedCount: 0, message: '0 asignaciones de cuota de proveedor eliminadas' };
    }
    
    const idsToDelete = recordsToDelete.map(r => r.id_vendedor_cuota_proveedor);
    
    // Luego eliminar por los IDs encontrados
    const deletedCount = await models.vendedorCuotaProveedor_model.destroy({
        where: {
            id_vendedor_cuota_proveedor: { [Op.in]: idsToDelete }
        }
    });
    
    return { deletedCount, message: `${deletedCount} asignaciones de cuota de proveedor eliminadas` };
}

module.exports = {
    getAll,
    getById,
    getByVendedor,
    getByProveedor,
    create,
    updateById,
    deleteById,
    deleteByDateRange
};