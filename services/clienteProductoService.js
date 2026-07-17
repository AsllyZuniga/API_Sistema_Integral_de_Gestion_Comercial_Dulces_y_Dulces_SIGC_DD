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

const toArr = (val) => {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap((v) => String(v).split(',').map((s) => s.trim())).filter(Boolean);
    return [...new Set(flat)];
};

// Devuelve los productos comprados por cada cliente asociados a un vendedor específico
async function getProductosPorClientePorVendedor(idVendedor, filters = {}) {
    const replacements = { idVendedor };
    const conditions = ['v.id_vendedor = :idVendedor'];
    const joins = [];

    if (filters.fechaInicio) {
        conditions.push('v.fecha >= :fechaInicio');
        replacements.fechaInicio = toDateOnly(filters.fechaInicio);
    }

    if (filters.fechaFin) {
        conditions.push('v.fecha <= :fechaFin');
        replacements.fechaFin = toDateOnly(filters.fechaFin);
    }

    const vendedoresFiltro = toArr(filters.codVendedor);
    const proveedoresFiltro = toArr(filters.codProveedor);
    const categoriasFiltro = toArr(filters.codCategoria);
    const ciudadesFiltro = toArr(filters.codCiudad);

    if (vendedoresFiltro.length) {
        joins.push('JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor');
        const placeholders = vendedoresFiltro.map((_, i) => `:fv${i}`).join(',');
        vendedoresFiltro.forEach((v, i) => { replacements[`fv${i}`] = v; });
        conditions.push(`vd.codigo_vendedor IN (${placeholders})`);
    }

    if (proveedoresFiltro.length) {
        const placeholders = proveedoresFiltro.map((_, i) => `:fp${i}`).join(',');
        proveedoresFiltro.forEach((p, i) => { replacements[`fp${i}`] = p; });
        conditions.push(`CAST(it.id_proveedor AS TEXT) IN (${placeholders})`);
    }

    if (categoriasFiltro.length) {
        const placeholders = categoriasFiltro.map((_, i) => `:fc${i}`).join(',');
        categoriasFiltro.forEach((c, i) => { replacements[`fc${i}`] = c; });
        conditions.push(`CAST(it.id_categoria AS TEXT) IN (${placeholders})`);
    }

    if (ciudadesFiltro.length) {
        const placeholders = ciudadesFiltro.map((_, i) => `:fci${i}`).join(',');
        ciudadesFiltro.forEach((c, i) => { replacements[`fci${i}`] = c; });
        conditions.push(`CAST(dv.id_ciudad_original AS TEXT) IN (${placeholders})`);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const joinClause = joins.length ? joins.join(' ') : '';

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
        ${joinClause}
        ${whereClause}
        ORDER BY v.fecha DESC, v.id_venta, it.descripcion
    `;
    const rows = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
    });

    // Consolidar: agrupar por cliente+producto, sumar cantidad y subtotal
    const map = new Map();
    for (const row of rows) {
        const key = `${row.cliente}|||${row.producto}`;
        const cantidad = parseFloat(row.cantidad) || 0;
        const subtotal = parseFloat(row.subtotal_producto) || 0;

        if (map.has(key)) {
            const entry = map.get(key);
            entry.cantidad += cantidad;
            entry.subtotal_producto += subtotal;
        } else {
            map.set(key, {
                id_cliente: row.id_cliente,
                cliente: row.cliente,
                id_item: row.id_item,
                producto: row.producto,
                cantidad,
                subtotal_producto: subtotal
            });
        }
    }

    return Array.from(map.values()).map(entry => ({
        ...entry,
        precio_promedio_ponderado: entry.cantidad !== 0
            ? parseFloat((entry.subtotal_producto / entry.cantidad).toFixed(2))
            : 0
    }));
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
