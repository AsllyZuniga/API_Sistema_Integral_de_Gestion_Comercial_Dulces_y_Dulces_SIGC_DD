const { performance } = require('perf_hooks');

async function monitorearImportacion() {
    console.log('🔍 INICIANDO MONITOREO DE IMPORTACIÓN...');
    
    setInterval(async () => {
        const memoria = process.memoryUsage();
        
        // Verificar cantidad de registros en BD
        const { QueryTypes } = require('sequelize');
        const models = require('../models');
        
        const stats = await models.sequelize.query(`
            SELECT 
                (SELECT COUNT(*) FROM ventas) as total_ventas,
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM items) as total_items,
                (SELECT COUNT(*) FROM proveedores) as total_proveedores
        `, { type: QueryTypes.SELECT });
        
        console.log('📊 ESTADO ACTUAL:');
        console.log(`   • Ventas: ${stats[0].total_ventas}`);
        console.log(`   • Clientes: ${stats[0].total_clientes}`);
        console.log(`   • Items: ${stats[0].total_items}`);
        console.log(`   • Proveedores: ${stats[0].total_proveedores}`);
        console.log(`   • RAM: ${(memoria.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log('---');
        
    }, 30000); // Cada 30 segundos
}

monitorearImportacion();