const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🔍 BUSCANDO CATEGORÍAS DUPLICADAS POR NOMBRE...\n');
    
    // Query para PostgreSQL
    const duplicados = await sequelize.query(`
      SELECT 
        TRIM(nombre) as nombre,
        COUNT(*) as cantidad,
        ARRAY_AGG(id_categoria ORDER BY id_categoria) as ids
      FROM categoria
      GROUP BY TRIM(nombre)
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicados.length === 0) {
      console.log('✅ No hay categorías duplicadas\n');
      process.exit(0);
    }

    console.log(`📊 ENCONTRADOS ${duplicados.length} GRUPOS DUPLICADOS\n`);
    
    let totalDuplicados = 0;
    duplicados.forEach(dup => {
      totalDuplicados += dup.cantidad - 1;
      console.log(`"${dup.nombre}": ${dup.cantidad} registros`);
      console.log(`   IDs: ${dup.ids.join(', ')}`);
      console.log();
    });

    console.log(`⚠️  TOTAL DE REGISTROS DUPLICADOS: ${totalDuplicados}\n`);
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
