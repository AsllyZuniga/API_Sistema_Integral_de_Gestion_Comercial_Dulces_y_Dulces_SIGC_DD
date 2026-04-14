const { sequelize } = require('../models');
const { QueryTypes, Op } = require('sequelize');

// Devuelve todos los productos comprados por cada cliente (general)
async function getProductosPorCliente() {
    const query = `
        SELECT 
            c.id_cliente, 
            c.razon_social AS cliente,
            it.id_item, 
            it.codigo_item, 
            it.descripcion, 
            SUM(dv.cantidad) AS cantidad_total, 
            SUM(dv.subtotal) AS subtotal_total
        FROM cliente c
        JOIN venta v ON v.id_cliente = c.id_cliente
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        GROUP BY c.id_cliente, c.razon_social, it.id_item, it.codigo_item, it.descripcion
        ORDER BY c.razon_social, it.descripcion
    `;
    return sequelize.query(query, { type: QueryTypes.SELECT });
}

// Helper functions for date parsing
const toDateOnly = (value) => {
    if (!value) {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

// Devuelve los productos comprados por cada cliente asociados a un vendedor específico
async function getProductosPorClientePorVendedor(idVendedor, filters = {}) {
    const replacements = { idVendedor };
    let whereClause = 'WHERE v.id_vendedor = :idVendedor';
    
    if (filters.fechaInicio) {
        whereClause += ' AND v.fecha >= :fechaInicio';
        replacements.fechaInicio = toDateOnly(filters.fechaInicio);
    }
    
    if (filters.fechaFin) {
        whereClause += ' AND v.fecha <= :fechaFin';
        replacements.fechaFin = toDateOnly(filters.fechaFin);
    }
    
    const query = `
        SELECT 
            v.id_venta,
            v.fecha,
            v.id_cliente,
            c.razon_social AS cliente,
            v.id_vendedor,
            v.numero_documento,
            dv.id_item,
            it.descripcion AS producto,
            dv.cantidad,
            dv.precio_unitario,
            COALESCE(dv.subtotal, dv.cantidad * dv.precio_unitario) AS subtotal_producto
        FROM venta v
        JOIN cliente c ON v.id_cliente = c.id_cliente
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        ${whereClause}
        ORDER BY v.fecha DESC, v.id_venta, it.descripcion
    `;
    return sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
    });
}

// Devuelve todos los datos relacionados con un vendedor específico para depuración
async function debugProductosPorClientePorVendedor(idVendedor) {
    const query = `
        SELECT 
            v.id_vendedor, 
            v.id_cliente, 
            v.id_venta, 
            dv.id_detalle, 
            dv.id_item, 
            c.razon_social AS cliente, 
            it.descripcion AS producto
        FROM venta v
        LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
        LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        LEFT JOIN item it ON it.id_item = dv.id_item
        WHERE v.id_vendedor = :idVendedor
    `;
    return sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { idVendedor }
    });
}

// Devuelve las ventas asociadas a un vendedor específico para depuración
async function debugVentasPorVendedor(idVendedor) {
    const query = `
        SELECT *
        FROM venta v
        WHERE v.id_vendedor = :idVendedor
    `;
    return sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { idVendedor }
    });
}

module.exports = {
    getProductosPorCliente,
    getProductosPorClientePorVendedor,
    debugProductosPorClientePorVendedor,
    debugVentasPorVendedor
};
