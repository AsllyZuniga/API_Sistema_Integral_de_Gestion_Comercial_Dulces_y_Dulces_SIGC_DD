const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n📊 VERIFICANDO VINCULACIÓN CATEGORÍA ↔ CUOTA...\n');
    
    // Verificar cuántas categorías tienen id_cuota_categoria
    const conCuota = await sequelize.query(`
      SELECT COUNT(*) as total FROM categoria WHERE id_cuota_categoria IS NOT NULL
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Categorías con id_cuota_categoria: ${conCuota[0].total}`);
    
    // Verificar qué hay en cuotaCategoria para marzo 2026
    const cuotasMarzo = await sequelize.query(`
      SELECT COUNT(*) as total FROM "cuotaCategoria" 
      WHERE fecha_inicio >= '2026-03-01' AND fecha_fin <= '2026-03-31'
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Cuotas cargadas para marzo 2026: ${cuotasMarzo[0].total}`);
    
    if (conCuota[0].total === 0 && cuotasMarzo[0].total > 0) {
      console.log('\n⚠️  Las categorías NO TIENEN id_cuota_categoria asignado');
      console.log('Necesito reconstruir esa vinculación...');
    } else if (conCuota[0].total > 0) {
      console.log('\n✅ Las categorías ya tienen id_cuota_categoria asignado');
      
      // Mostrar algunos ejemplos
      const ejemplos = await sequelize.query(`
        SELECT c.id_categoria, c.nombre, c.id_cuota_categoria, cc.cuota, cc.fecha_inicio, cc.fecha_fin
        FROM categoria c
        LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
        WHERE c.id_cuota_categoria IS NOT NULL
        LIMIT 5
      `, { type: sequelize.QueryTypes.SELECT });
      
      console.log('\nEjemplos de vinculaciones:');
      ejemplos.forEach(row => {
        console.log(`  ${row.nombre}: cc${row.id_cuota_categoria} (cuota: ${row.cuota})`);
      });
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
