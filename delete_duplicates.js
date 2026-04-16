const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🗑️  ELIMINANDO CATEGORÍAS DUPLICADAS VIEJAS...\n');
    
    // IDs a eliminar (los antiguos/viejos)
    const idsAEliminar = [699, 698, 647, 649, 702, 721, 622, 729];
    
    console.log(`Eliminando IDs: ${idsAEliminar.join(', ')}`);
    
    // Primero verificar si hay referencias en otras tablas
    const referencias = await sequelize.query(`
      SELECT c.id_categoria, c.nombre, COUNT(*) as referencias
      FROM categoria c
      WHERE c.id_categoria IN (${idsAEliminar.join(',')})
      GROUP BY c.id_categoria, c.nombre
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\nCategorías a eliminar:');
    referencias.forEach(ref => {
      console.log(`  ID ${ref.id_categoria}: "${ref.nombre}"`);
    });
    
    // Eliminar las categorías
    const resultado = await sequelize.query(`
      DELETE FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `);
    
    console.log(`\n✅ SE ELIMINARON ${resultado[1].affectedRows || idsAEliminar.length} CATEGORÍAS DUPLICADAS`);
    
    // Verificar que se eliminarón
    const despues = await sequelize.query(`
      SELECT COUNT(*) as total FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (despues[0].total === 0) {
      console.log('✅ Verificación OK: Todos los duplicados fueron eliminados');
    } else {
      console.log(`⚠️  Advertencia: Aún quedan ${despues[0].total} categorías duplicadas`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
