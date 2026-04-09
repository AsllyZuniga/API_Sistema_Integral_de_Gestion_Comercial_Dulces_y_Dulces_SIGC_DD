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
const ExcelJS = require('exceljs');

const BATCH_SIZE = 1000; // Procesar de 1000 en 1000 registros

const exportAllDataToExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Vendedores
    const vendedoresSheet = workbook.addWorksheet('Vendedores');
    const vendedores = await vendedor_model.findAll({ raw: true });
    if (vendedores.length > 0) {
        vendedoresSheet.columns = Object.keys(vendedores[0]).map(key => ({ header: key, key }));
        vendedoresSheet.addRows(vendedores);
    }

    // Ventas (en lotes)
    const ventasSheet = workbook.addWorksheet('Ventas');
    let ventasOffset = 0;
    let ventasBatch;
    let firstVentasBatch = true;
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
        if (ventasBatch.length > 0) {
            const flattenedVentas = ventasBatch.map(v => {
                const flat = { ...v };
                if (v.cliente) {
                    Object.keys(v.cliente).forEach(key => {
                        flat[`cliente_${key}`] = v.cliente[key];
                    });
                }
                if (v.vendedor) {
                    Object.keys(v.vendedor).forEach(key => {
                        flat[`vendedor_${key}`] = v.vendedor[key];
                    });
                }
                delete flat.cliente;
                delete flat.vendedor;
                return flat;
            });
            ventasSheet.columns = Object.keys(flattenedVentas[0]).map(key => ({ header: key, key }));
            ventasSheet.addRows(flattenedVentas);
        }
        ventasOffset += BATCH_SIZE;
    } while (ventasBatch.length > 0);

    // Detalle Ventas
    const detalleVentasSheet = workbook.addWorksheet('Detalle_Ventas');
    const detallesVenta = await detalle_venta_model.findAll({
        include: [
            { model: venta_model, as: 'venta' },
            { model: item_model, as: 'item' }
        ],
        raw: true,
        nest: true
    });

    if (detallesVenta.length > 0) {
        const flattenedDetalles = detallesVenta.map(dv => {
            const flat = { ...dv };
            if (dv.venta) {
                Object.keys(dv.venta).forEach(key => {
                    flat[`venta_${key}`] = dv.venta[key];
                });
            }
            if (dv.item) {
                Object.keys(dv.item).forEach(key => {
                    flat[`item_${key}`] = dv.item[key];
                });
            }
            delete flat.venta;
            delete flat.item;
            return flat;
        });
        detalleVentasSheet.columns = Object.keys(flattenedDetalles[0]).map(key => ({ header: key, key }));
        detalleVentasSheet.addRows(flattenedDetalles);
    }

    // Items
    const itemsSheet = workbook.addWorksheet('Items');
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
    if (items.length > 0) {
        const flattenedItems = items.map(i => {
            const flat = { ...i };
            if (i.proveedor) {
                Object.keys(i.proveedor).forEach(key => {
                    flat[`proveedor_${key}`] = i.proveedor[key];
                });
            }
            if (i.categoria) {
                Object.keys(i.categoria).forEach(key => {
                    flat[`categoria_${key}`] = i.categoria[key];
                });
            }
            if (i.subcategoria) {
                Object.keys(i.subcategoria).forEach(key => {
                    flat[`subcategoria_${key}`] = i.subcategoria[key];
                });
            }
            if (i.megacategoria) {
                Object.keys(i.megacategoria).forEach(key => {
                    flat[`megacategoria_${key}`] = i.megacategoria[key];
                });
            }
            delete flat.proveedor;
            delete flat.categoria;
            delete flat.subcategoria;
            delete flat.megacategoria;
            return flat;
        });
        itemsSheet.columns = Object.keys(flattenedItems[0]).map(key => ({ header: key, key }));
        itemsSheet.addRows(flattenedItems);
    }

    return workbook;
};

module.exports = {
    exportAllDataToExcel
};
