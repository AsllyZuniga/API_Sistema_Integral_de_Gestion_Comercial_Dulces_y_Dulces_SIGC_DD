const models = require('../models');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

async function truncateTables() {
    try {
        await models.sequelize.authenticate();
        console.log('✅ Conectado\n');
        
        console.log('Truncando tablas...');
        await models.sequelize.query('TRUNCATE TABLE detalle_venta CASCADE', { type: QueryTypes.RAW });
        console.log('✅ detalle_venta');
        
        await models.sequelize.query('TRUNCATE TABLE venta CASCADE', { type: QueryTypes.RAW });
        console.log('✅ venta');
        
        await models.sequelize.query('TRUNCATE TABLE proveedor CASCADE', { type: QueryTypes.RAW });
        console.log('✅ proveedor');
        
        await models.sequelize.query('TRUNCATE TABLE item CASCADE', { type: QueryTypes.RAW });
        console.log('✅ item');
        
        await models.sequelize.query('TRUNCATE TABLE obsequio CASCADE', { type: QueryTypes.RAW });
        console.log('✅ obsequio');
        
        await models.sequelize.query('TRUNCATE TABLE tipo_documento CASCADE', { type: QueryTypes.RAW });
        console.log('✅ tipo_documento');
        
        console.log('\n✅ Todos los datos eliminados');
        await models.sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

truncateTables();
