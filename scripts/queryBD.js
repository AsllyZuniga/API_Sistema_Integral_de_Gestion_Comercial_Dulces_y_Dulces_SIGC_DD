const models = require('../models');
require('dotenv').config();

async function queryData() {
    try {
        await models.sequelize.authenticate();
        
        console.log('🔍 ANÁLISIS DE DATOS EN BD\n');
        
        // Obtener últimas 3 ventas
        const ventas = await models.venta_model.findAll({
            limit: 3,
            order: [['id_venta', 'DESC']],
            include: ['cliente']
        });
        
        console.log(`📊 Últimas ${ventas.length} venta(s) en BD:\n`);
        
        for (const venta of ventas) {
            console.log(`\n═════ VENTA ID ${venta.id_venta} ═════`);
            console.log(`Documento: ${venta.numero_documento}`);
            console.log(`Fecha: ${venta.fecha}`);
            console.log(`Cliente: ${venta.cliente?.razon_social}`);
            console.log(`\n📋 CAMPOS DE VENTA:`);
            console.log(`  • precio_unitario_con_impuesto: ${venta.precio_unitario_con_impuesto}`);
            console.log(`  • subtotal: ${venta.subtotal}`);
            console.log(`  • valor_descuentos: ${venta.valor_descuentos}`);
            console.log(`  • valor_impuestos: ${venta.valor_impuestos}`);
            console.log(`  • valor_neto: ${venta.valor_neto}`);
            console.log(`  • margen_promedio: ${venta.margen_promedio}`);
            console.log(`  • impuesto_afecta_margen: ${venta.impuesto_afecta_margen}`);
            console.log(`  • condicion_pago: ${venta.condicion_pago}`);
            
            // Detalles
            const detalles = await models.detalle_venta_model.findAll({
                where: { id_venta: venta.id_venta },
                include: ['item']
            });
            
            console.log(`\n📌 DETALLES: ${detalles.length}`);
            for (const det of detalles) {
                console.log(`\n  Detalle ${det.id_detalle}:`);
                console.log(`    • Item: ${det.item?.descripcion}`);
                console.log(`    • Cantidad: ${det.cantidad}`);
                console.log(`    • Precio unitario: ${det.precio_unitario}`);
                console.log(`    • Costo promedio total: ${det.costo_promedio_total}`);
                console.log(`    • Descuento: ${det.descuento}`);
                console.log(`    • Subtotal: ${det.subtotal}`);
                console.log(`    • cantidad_emp: ${det.cantidad_emp}`);
                
                // Mostrar TODOS los campos disponibles
                console.log(`\n    ⚠️  Campos disponibles en modelo:`);
                Object.keys(det.dataValues).forEach(key => {
                    if (key.startsWith('id_') === false && key !== 'createdAt' && key !== 'updatedAt') {
                        console.log(`      - ${key}: ${det.dataValues[key]}`);
                    }
                });
            }
        }
        
        await models.sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

queryData();
