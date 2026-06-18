const {
    vendedor_model,
    venta_model,
    detalle_venta_model,
    item_model,
    cliente_model,
    proveedor_model,
    categoria_model,
    subcategoria_model,
    megacategoria_model
} = require('../models');

const BATCH_SIZE = 1000; // Procesar de 1000 en 1000 registros

const exportAllDataToJson = async () => {
    const exportData = {};

    // Vendedores
    const vendedores = await vendedor_model.findAll({ raw: true });
    exportData.vendedores = vendedores;

    // Ventas (en lotes)
    const ventasData = [];
    let ventasOffset = 0;
    let ventasBatch;
    do {
        ventasBatch = await venta_model.findAll({
            include: [
                { model: cliente_model, as: 'cliente' },
                { model: vendedor_model, as: 'vendedor' }
            ],
            raw: true,
            nest: true,
            limit: BATCH_SIZE,
            offset: ventasOffset,
        });
        ventasData.push(...ventasBatch);
        ventasOffset += BATCH_SIZE;
    } while (ventasBatch.length > 0);
    exportData.ventas = ventasData;

    // Detalle Ventas
    const detallesVenta = await detalle_venta_model.findAll({
        include: [
            { model: venta_model, as: 'venta' },
            { model: item_model, as: 'item' }
        ],
        raw: true,
        nest: true
    });
    exportData.detalleVentas = detallesVenta;

    // Items
    const items = await item_model.findAll({
        include: [
            { model: proveedor_model, as: 'proveedor' },
            { model: categoria_model, as: 'categoria' },
            { model: subcategoria_model, as: 'subcategoria' },
            { model: megacategoria_model, as: 'megacategoria' }
        ],
        raw: true,
        nest: true
    });
    exportData.items = items;

    // Clientes
    const clientes = await cliente_model.findAll({ raw: true });
    exportData.clientes = clientes;

    // Proveedores
    const proveedores = await proveedor_model.findAll({ raw: true });
    exportData.proveedores = proveedores;

    // Categorías
    const categorias = await categoria_model.findAll({ raw: true });
    exportData.categorias = categorias;

    // Subcategorías
    const subcategorias = await subcategoria_model.findAll({ raw: true });
    exportData.subcategorias = subcategorias;

    // Megacategorías
    const megacategorias = await megacategoria_model.findAll({ raw: true });
    exportData.megacategorias = megacategorias;

    return exportData;
};

module.exports = {
    exportAllDataToJson
};
