const { sequelize } = require('./models');

/**
 * Script para limpiar duplicados de categorías automáticamente
 * Estrategia: Mantener el ID menor (más antiguo/confiable) y eliminar los duplicados
 */
(async () => {
  try {
    console.log('\n🔧 REPARANDO CATEGORÍAS DUPLICADAS (Automático)...\n');

    // Paso 1: Encontrar duplicados
    console.log('🔍 Buscando categorías duplicadas...\n');
    
    const duplicados = await sequelize.query(`
      SELECT nombre, array_agg(id_categoria ORDER BY id_categoria) as ids
      FROM categoria
      GROUP BY nombre
      HAVING COUNT(*) > 1
      ORDER BY nombre
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicados.length === 0) {
      console.log('✅ No hay categorías duplicadas\n');
      process.exit(0);
    }

    console.log(`📋 Se encontraron ${duplicados.length} categorías duplicadas:\n`);
    
    const mapeoIdsAntiguosANuevos = {};
    
    duplicados.forEach(dup => {
      const ids = dup.ids;
      const idMenor = Math.min(...ids);
      const idsAEliminar = ids.filter(id => id !== idMenor);
      
      console.log(`   "${dup.nombre}"`);
      console.log(`      IDs: ${ids.join(', ')} → Mantener: ${idMenor}, Eliminar: ${idsAEliminar.join(', ')}`);
      
      // Crear mapeo
      idsAEliminar.forEach(idAntiguo => {
        mapeoIdsAntiguosANuevos[idAntiguo] = idMenor;
      });
    });

    console.log(`\n📋 Total: ${duplicados.length} grupos duplicados, ${Object.keys(mapeoIdsAntiguosANuevos).length} IDs a eliminar\n`);

    // Paso 2: Actualizar referencias
    console.log('🔄 Actualizando referencias en otras tablas...\n');

    const tablasConFK = [
      { tabla: 'subcategoria', columna: 'id_categoria' },
      { tabla: 'item', columna: 'id_categoria' },
      { tabla: 'vendedor_cuota_categoria', columna: 'id_categoria' },
      { tabla: 'cuota_categoria', columna: 'id_categoria' },
      { tabla: 'cuotaCategoria', columna: 'id_categoria' }
    ];

    let totalActualizadas = 0;

    for (const { tabla, columna } of tablasConFK) {
      try {
        for (const [idAntiguo, idNuevo] of Object.entries(mapeoIdsAntiguosANuevos)) {
          const result = await sequelize.query(`
            UPDATE ${tabla}
            SET ${columna} = :idNuevo
            WHERE ${columna} = :idAntiguo
          `, {
            replacements: { idNuevo: parseInt(idNuevo), idAntiguo: parseInt(idAntiguo) }
          });

          const cantidad = result[1]?.affectedRows || 0;
          if (cantidad > 0) {
            console.log(`   ✅ ${tabla}.${columna}: ${idAntiguo} → ${idNuevo} (${cantidad} registros)`);
            totalActualizadas += cantidad;
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Tabla ${tabla}: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(`\n✅ ${totalActualizadas} referencias actualizadas en total\n`);

    // Paso 3: Eliminar categorías duplicadas
    console.log('🗑️  Eliminando categorías duplicadas...\n');

    const idsAEliminar = Object.keys(mapeoIdsAntiguosANuevos).map(id => parseInt(id));
    
    const resultado = await sequelize.query(`
      DELETE FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `);

    console.log(`✅ Se eliminaron ${idsAEliminar.length} categorías duplicadas\n`);

    // Paso 4: Verificar
    console.log('🔍 Verificando...\n');
    
    const verificacion = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM categoria
      WHERE id_categoria IN (${idsAEliminar.join(',')})
    `, { type: sequelize.QueryTypes.SELECT });

    if (verificacion[0].total === 0) {
      console.log('✅ Verificación OK: Todos los duplicados fueron eliminados correctamente\n');
      console.log('✨ BD lista para importación de cuotas\n');
    } else {
      console.log(`⚠️  Aún quedan ${verificacion[0].total} registros por eliminar\n`);
    }

    process.exit(0);
  } catch(e) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
