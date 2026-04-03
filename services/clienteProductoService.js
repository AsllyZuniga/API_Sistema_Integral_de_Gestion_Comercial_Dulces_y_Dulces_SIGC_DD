const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

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

// Devuelve los productos comprados por cada cliente asociados a un vendedor específico
async function getProductosPorClientePorVendedor(idVendedor) {
    const query = `
        SELECT 
            c.id_cliente, 
            c.razon_social AS cliente,
            it.id_item, 
            it.codigo_item, 
            it.descripcion, 
            COALESCE(SUM(dv.cantidad), 0) AS cantidad_total, 
            COALESCE(SUM(dv.subtotal), 0) AS subtotal_total
        FROM cliente c
        LEFT JOIN venta v ON v.id_cliente = c.id_cliente AND v.id_vendedor = :idVendedor
        LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        LEFT JOIN item it ON it.id_item = dv.id_item
        GROUP BY c.id_cliente, c.razon_social, it.id_item, it.codigo_item, it.descripcion
        ORDER BY c.razon_social, it.descripcion
    `;
    return sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { idVendedor }
    });
}

module.exports = {
    getProductosPorCliente,
    getProductosPorClientePorVendedor
};
