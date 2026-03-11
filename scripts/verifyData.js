const models = require('../models');
require('dotenv').config();

async function verifyData() {
    try {
        await models.sequelize.authenticate();
        console.log('✅ BD conectada\n');
        
        // Verificar PROVEEDOR
        console.log('=== PROVEEDORES (LINEA separado) ===\n');
        const proveedores = await models.proveedor_model.findAll({ limit: 3 });
        proveedores.forEach(p => {
            console.log(`ID: ${p.id_proveedor}`);
            console.log(`  • Código: "${p.codigo}"`);
            console.log(`  • Nombre: "${p.nombre}"`);
        });
        
        // Verificar TIPO_DOCUMENTO
        console.log('\n=== TIPOS DE DOCUMENTO (Nro documento separado) ===\n');
        const tiposDoc = await models.tipo_documento_model.findAll({ limit: 3 });
        tiposDoc.forEach(t => {
            console.log(`ID: ${t.id_tipo_documento}`);
            console.log(`  • Nombre: "${t.nombre}"`);
            console.log(`  • Consecutivo: ${t.consecutivo}`);
        });
        
        // Verificar VENDEDOR
        console.log('\n=== VENDEDORES (sin datos de sucursales) ===\n');
        const vendedores = await models.vendedor_model.findAll({ limit: 3 });
        vendedores.forEach(v => {
            console.log(`ID: ${v.id_vendedor}`);
            console.log(`  • Código: "${v.codigo_vendedor}"`);
            console.log(`  • Nombre: "${v.nombre}"`);
        });
        
        // Verificar ITEM (cantidad_empaque)
        console.log('\n=== ITEMS (cantidad_empaque) ===\n');
        const items = await models.item_model.findAll({ limit: 3 });
        items.forEach(i => {
            console.log(`ID: ${i.id_item}`);
            console.log(`  • Código: "${i.codigo_item}"`);
            console.log(`  • Descripción: "${i.descripcion}"`);
            console.log(`  • Cantidad empaque: ${i.cantidad_empaque}`);
        });
        
        // Verificar OBSEQUIO
        console.log('\n=== OBSEQUIOS (con valor de subtotal) ===\n');
        const obsequios = await models.obsequio_model.findAll({  limit: 3 });
        obsequios.forEach(o => {
            console.log(`ID: ${o.id_obsequio}`);
            console.log(`  • Descripción: "${o.descripcion}"`);
            console.log(`  • Valor: ${o.valor_obsequio}`);
        });
        
        // Estadísticas de VENTA
        console.log('\n=== ESTADÍSTICAS DE VENTAS ===\n');
        const stats = await models.venta_model.findAll({ 
            attributes: [
                [models.sequelize.fn('COUNT', models.sequelize.col('id_venta')), 'totalVentas'],
                [models.sequelize.fn('COUNT', models.sequelize.col('id_tipo_documento')), 'conTipoDoc'],
            ],
            raw: true 
        });
        console.log(`Total ventas: ${stats[0]?.totalVentas || 0}`);
        console.log(`Con tipo_documento: ${stats[0]?.conTipoDoc || 0}`);
        
        await models.sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyData();
