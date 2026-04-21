const { sequelize } = require('./models');

(async () => {
  try {
    console.log('\n🔍 VERIFICANDO CUAL ID SE USÓ EN LA CARGA...\n');
    
    // Verificar qué IDs están en cuotaCategoria
    const cuotasActuales = await sequelize.query(`
      SELECT DISTINCT cc.id_categoria, c.nombre
      FROM "cuotaCategoria" cc
      JOIN categoria c ON c.id_categoria = cc.id_categoria
      WHERE c.nombre IN ('0300 - 1000-CAFES', '0700 - 1000-CULINARIOS', '1201 - 1000-GALLETAS', '1500 - 1000-LACTEOS CULINARIOS', '1750 - 1000-MODIFICADOR DE LECHE', '2950 - 2500-CHOCOLATES')
      ORDER BY c.nombre, id_categoria
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('IDs QUE ESTAN EN cuotaCategoria (los correctos a mantener):');
    cuotasActuales.forEach(row => {
      console.log(`  "${row.nombre}" → ID ${row.id_categoria}`);
    });
    
    console.log('\n📋 IDs A ELIMINAR (duplicados viejos):');
    
    // Todos los IDs duplicados
    const duplicados = {
      '0300 - 1000-CAFES': [699, 747],
      '0700 - 1000-CULINARIOS': [698, 781],
      '1201 - 1000-GALLETAS': [647, 744],
      '1500 - 1000-LACTEOS CULINARIOS': [649, 702, 779],
      '1750 - 1000-MODIFICADOR DE LECHE': [721, 782],
      '2950 - 2500-CHOCOLATES': [622, 729, 768]
    };
    
    const idsAEliminar = [];
    
    Object.entries(duplicados).forEach(([nombre, ids]) => {
      const cuotaActual = cuotasActuales.find(q => q.nombre === nombre);
      if (cuotaActual) {
        ids.forEach(id => {
          if (id !== cuotaActual.id_categoria) {
            idsAEliminar.push(id);
            console.log(`  ID ${id} (${nombre})`);
          }
        });
      }
    });
    
    if (idsAEliminar.length === 0) {
      console.log('  ✅ No hay duplicados para eliminar');
    } else {
      console.log(`\n⚠️  ${idsAEliminar.length} IDs a eliminar`);
      console.log(`    IDs: ${idsAEliminar.join(', ')}`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
