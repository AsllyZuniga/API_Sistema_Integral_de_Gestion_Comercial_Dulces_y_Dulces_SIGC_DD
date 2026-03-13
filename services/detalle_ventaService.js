const { detalle_venta_model } = require('../models');

const getAll = async () => detalle_venta_model.findAll();

const getById = async (id) => detalle_venta_model.findByPk(id);

const create = async (data) => detalle_venta_model.create(data);

const updateById = async (id, data) => {
    const detalleVenta = await detalle_venta_model.findByPk(id);
    if (!detalleVenta) return null;
    await detalleVenta.update(data);
    return detalleVenta;
};

module.exports = {
    getAll,
    getById,
    create,
    updateById
};
