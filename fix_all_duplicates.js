const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🔧 REPARANDO TODOS LOS DUPLICADOS DE CATEGORÍAS...\n');
    
    // 1. Encontrar todos los duplicados
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
      console.log('✅ No hay duplicados para reparar\n');
      process.exit(0);
    }

    console.log(`📊 PROCESANDO ${duplicados.length} GRUPOS DUPLICADOS\n`);
    
    let totalActualizaciones = 0;
    let totalEliminados = 0;
    
    // 2. Para cada grupo, mantener el ID más bajo como canonical
    for (const dup of duplicados) {
      const [idCanonical, ...idsDuplicados] = dup.ids;
      console.log(`\n"${dup.nombre}"`);
      console.log(`   Canonical ID: ${idCanonical}`);
      console.log(`   Eliminar IDs: ${idsDuplicados.join(', ')}`);
      
      // Redirigir todas las referencias
      const tablas = [
        'subcategoria',
        '"cuotaCategoria"',
        'item',
        'cuotaProveedor'
      ];
      
      for (const tabla of tablas) {
        for (const idDuplicado of idsDuplicados) {
          try {
            const result = await sequelize.query(
              `UPDATE ${tabla} SET id_categoria = :canonical WHERE id_categoria = :duplicado`,
              {
                replacements: { canonical: idCanonical, duplicado: idDuplicado },
                type: sequelize.QueryTypes.UPDATE
              }
            );
            
            const actualizado = result[1] && result[1].rowCount ? result[1].rowCount : 0;
            if (actualizado > 0) {
              console.log(`   ✅ ${tabla}: ${actualizado} referencias actualizadas`);
              totalActualizaciones += actualizado;
            }
          } catch(e) {
            // Tabla no existe o sin columna, ignorar silenciosamente
          }
        }
      }
      
      // Eliminar IDs duplicados
      for (const idDuplicado of idsDuplicados) {
        await sequelize.query(
          `DELETE FROM categoria WHERE id_categoria = :id`,
          {
            replacements: { id: idDuplicado },
            type: sequelize.QueryTypes.DELETE
          }
        );
        totalEliminados++;
      }
    }

    console.log(`\n✅ REPARACIÓN COMPLETADA:`);
    console.log(`   • ${totalActualizaciones} referencias actualizadas en otras tablas`);
    console.log(`   • ${totalEliminados} registros duplicados eliminados`);
    console.log(`   • ${duplicados.length} grupos consolidados\n`);
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
