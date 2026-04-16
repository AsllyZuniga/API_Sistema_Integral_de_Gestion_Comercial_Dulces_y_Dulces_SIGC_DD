const { sequelize } = require('./models');

(async () => {
  try {
    const categorias = await sequelize.query(`
      SELECT nombre, id_categoria
      FROM categoria 
      WHERE nombre IN ('0300 - 1000-CAFES', '1201 - 1000-GALLETAS', '0700 - 1000-CULINARIOS', '1550 - 1000-LECHES EN POLVO', '1750 - 1000-MODIFICADOR DE LECHE', '2061 - 1000-RTD', '0401 - 1000-CPW', '0350 - 1000-CEREALES INFANTILES', '1100 - 1000-FORMULAS INFANTILES', '1250 - 1000-GUMS', '0101 - 1000-COMPOTAS', '1500 - 1000-LACTEOS CULINARIOS', '2950 - 2500-CHOCOLATES')
      ORDER BY nombre, id_categoria
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 CATEGORIAS ENCONTRADAS:\n');
    
    const porNombre = {};
    categorias.forEach(cat => {
      if (!porNombre[cat.nombre]) porNombre[cat.nombre] = [];
      porNombre[cat.nombre].push(cat.id_categoria);
    });
    
    let hayDuplicados = false;
    Object.entries(porNombre).forEach(([nombre, ids]) => {
      if (ids.length > 1) {
        console.log(`❌ DUPLICADO: "${nombre}"`);
        console.log(`   IDs: ${ids.join(', ')}`);
        hayDuplicados = true;
      } else {
        console.log(`✅ OK: "${nombre}" → ID ${ids[0]}`);
      }
    });
    
    if (!hayDuplicados) {
      console.log('\n✅ NO hay duplicados en categorias');
    } else {
      console.log('\n❌ SE ENCONTRARON DUPLICADOS');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
