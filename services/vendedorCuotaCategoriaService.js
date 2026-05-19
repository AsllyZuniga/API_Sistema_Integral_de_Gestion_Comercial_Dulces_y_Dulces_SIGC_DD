const models = require('../models');

// Obtener todas las asignaciones con relaciones
async function getAll() {
    return await models.vendedorCuotaCategoria_model.findAll({
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener por id
async function getById(id) {
    return await models.vendedorCuotaCategoria_model.findByPk(id, {
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener todas las cuotas de categoría de un vendedor
async function getByVendedor(id_vendedor) {
    return await models.vendedorCuotaCategoria_model.findAll({
        where: { id_vendedor },
        include: [
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
}

// Obtener todos los vendedores asignados a una categoría
async function getByCategoria(id_categoria) {
    return await models.vendedorCuotaCategoria_model.findAll({
        where: { id_categoria },
        include: [
            { model: models.vendedor_model, as: 'vendedor' }
        ]
    });
}

// Crear asignación (upsert para evitar duplicados)
async function create(data) {
    const { id_vendedor, id_categoria, cuota = 0, fecha_inicio, fecha_fin } = data;

    // Validar que existan el vendedor y la categoría
    const vendedor = await models.vendedor_model.findByPk(id_vendedor);
    if (!vendedor) throw new Error('Vendedor no encontrado');

    const categoria = await models.categoria_model.findByPk(id_categoria);
    if (!categoria) throw new Error('Categoría no encontrada');

    const [row] = await models.vendedorCuotaCategoria_model.upsert(
        { id_vendedor, id_categoria, cuota, fecha_inicio, fecha_fin },
        { returning: true }
    );
    return row;
}

// Actualizar por id
async function updateById(id, data) {
    const row = await models.vendedorCuotaCategoria_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de categoría no encontrada');
    return await row.update(data);
}

// Eliminar por id
async function deleteById(id) {
    const row = await models.vendedorCuotaCategoria_model.findByPk(id);
    if (!row) throw new Error('Asignación de cuota de categoría no encontrada');
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
    
    const deletedCount = await models.vendedorCuotaCategoria_model.destroy({
        where: {
            [Op.and]: [
                { fecha_inicio: { [Op.gte]: inicioISO } },
                { fecha_fin: { [Op.lte]: finISO } }
            ]
        }
    });
    
    return { deletedCount, message: `${deletedCount} asignaciones de cuota de categoría eliminadas` };
}

// Obtener por rango de fechas (para debug/consulta)
async function getByDateRange(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        throw new Error('Se requieren fechaInicio y fechaFin (YYYY-MM-DD)');
    }
    
    const { Op } = require('sequelize');
    
    // Convertir a ISO format para comparación correcta con BD
    const inicioISO = `${fechaInicio}T00:00:00.000Z`;
    const finISO = `${fechaFin}T23:59:59.999Z`;
    
    const records = await models.vendedorCuotaCategoria_model.findAll({
        where: {
            [Op.and]: [
                { fecha_inicio: { [Op.gte]: inicioISO } },
                { fecha_fin: { [Op.lte]: finISO } }
            ]
        },
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
    
    return { count: records.length, records };
}

// Obtener todos con fechas (sin filtrar) - para debug
async function getAllWithDates() {
    const records = await models.vendedorCuotaCategoria_model.findAll({
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ],
        limit: 50
    });
    
    return {
        total: records.length,
        message: 'Primeros 50 registros con fechas (para ver formato)',
        records: records.map(r => ({
            id: r.id,
            vendedor_codigo: r.vendedor?.codigo_vendedor,
            categoria_nombre: r.categoria?.nombre,
            fecha_inicio: r.fecha_inicio,
            fecha_inicio_type: typeof r.fecha_inicio,
            fecha_fin: r.fecha_fin,
            fecha_fin_type: typeof r.fecha_fin
        }))
    };
}

// Debug de comparación de fechas
async function debugDates(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        throw new Error('Se requieren fechaInicio y fechaFin (YYYY-MM-DD)');
    }
    
    const { Op } = require('sequelize');
    const sequelize = require('sequelize');
    
    // Obtener todos y hacer comparación manual
    const allRecords = await models.vendedorCuotaCategoria_model.findAll({
        include: [
            { model: models.vendedor_model, as: 'vendedor' },
            { model: models.categoria_model, as: 'categoria' }
        ]
    });
    
    const matching = allRecords.filter(r => {
        const inicio = new Date(r.fecha_inicio).toISOString().split('T')[0];
        const fin = new Date(r.fecha_fin).toISOString().split('T')[0];
        return inicio >= fechaInicio && fin <= fechaFin;
    });
    
    return {
        fechaInicio_buscado: fechaInicio,
        fechaFin_buscado: fechaFin,
        total_registros: allRecords.length,
        registros_que_coinciden: matching.length,
        ejemplo_fechas_bd: allRecords.slice(0, 3).map(r => ({
            fecha_inicio: r.fecha_inicio,
            fecha_fin: r.fecha_fin
        })),
        registros_coincidentes: matching.slice(0, 10).map(r => ({
            id: r.id,
            vendedor: r.vendedor?.codigo_vendedor,
            categoria: r.categoria?.nombre,
            fecha_inicio: r.fecha_inicio,
            fecha_fin: r.fecha_fin
        }))
    };
}

module.exports = {
    getAll,
    getById,
    getByVendedor,
    getByCategoria,
    create,
    updateById,
    deleteById,
    deleteByDateRange,
    getByDateRange,
    getAllWithDates,
    debugDates
};
