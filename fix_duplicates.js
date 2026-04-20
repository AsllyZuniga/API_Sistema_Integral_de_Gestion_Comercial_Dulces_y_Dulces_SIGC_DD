const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🔧 REPARANDO REFERENCIAS A CATEGORÍAS DUPLICADAS...\n');
    
    // Mapeo de IDs viejos → IDs nuevos correctos
    const mapeoIdsAntiguosANuevos = {
      699: 747,  // 0300 - 1000-CAFES
      698: 781,  // 0700 - 1000-CULINARIOS
      647: 744,  // 1201 - 1000-GALLETAS
      649: 779,  // 1500 - 1000-LACTEOS CULINARIOS
      702: 779,  // 1500 - 1000-LACTEOS CULINARIOS
      721: 782,  // 1750 - 1000-MODIFICADOR DE LECHE
      622: 768,  // 2950 - 2500-CHOCOLATES
      729: 768   // 2950 - 2500-CHOCOLATES
    };
    
    console.log('📋 Actualizando referencias en subcategoria...\n');
    
    for (const [idAntiguo, idNuevo] of Object.entries(mapeoIdsAntiguosANuevos)) {
      try {
        // Obtener nombre de la categoría
        const catAntigua = await sequelize.query(`
          SELECT nombre FROM categoria WHERE id_categoria = ${idAntiguo}
        `, { type: sequelize.QueryTypes.SELECT });
        
        if (catAntigua.length === 0) continue;
        
        const nombre = catAntigua[0].nombre;
        
        // Contar referencias
        const refs = await sequelize.query(`
          SELECT COUNT(*) as total FROM subcategoria 
          WHERE id_categoria = ${idAntiguo}
        `, { type: sequelize.QueryTypes.SELECT });
        
        const cantidad = refs[0].total;
        
        if (cantidad > 0) {
          // Actualizar referencias
          await sequelize.query(`
            UPDATE subcategoria 
            SET id_categoria = ${idNuevo}
            WHERE id_categoria = ${idAntiguo}
          `);
          
          console.log(`  ✅ ID ${idAntiguo} → ${idNuevo} (${nombre}): ${cantidad} subcategorías actualizadas`);
        }
      } catch(e) {
        console.log(`  ⚠️  ID ${idAntiguo}: ${e.message.split('\n')[0]}`);
      }
    }
    
    console.log('\n✅ REFERENCIAS ACTUALIZADAS\n');
    
    // Ahora eliminar los IDs viejos
    const idsAEliminar = [699, 698, 647, 649, 702, 721, 622, 729];
    
    console.log('🗑️  Eliminando categorías duplicadas viejas...\n');
    
    const resultado = await sequelize.query(`
      DELETE FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `);
    
    console.log(`✅ SE ELIMINARON ${resultado[1].affectedRows || idsAEliminar.length} CATEGORÍAS DUPLICADAS VIEJAS`);
    
    // Verificar
    const despues = await sequelize.query(`
      SELECT COUNT(*) as total FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (despues[0].total === 0) {
      console.log('✅ Verificación OK: Todos los duplicados fueron eliminados correctamente\n');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
