const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n📊 ESTRUCTURA REAL DE TABLAS...\n');
    
    // Columnas de categoria
    const categoriaCols = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='categoria'
      ORDER BY ordinal_position
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('📋 Tabla: categoria');
    categoriaCols.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Columnas de cuotaCategoria
    const cuotaCategoriaCols = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='cuotaCategoria'
      ORDER BY ordinal_position
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📋 Tabla: cuotaCategoria');
    cuotaCategoriaCols.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
