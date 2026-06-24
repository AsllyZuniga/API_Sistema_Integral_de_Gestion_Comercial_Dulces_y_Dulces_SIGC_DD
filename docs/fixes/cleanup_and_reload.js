const { sequelize } = require('../../models');

(async () => {
  try {
    console.log('\n🗑️  LIMPIANDO DATOS INCORRECTOS DE IMPORTACIÓN ANTERIOR...\n');

    // Limpiar: solo actualizar fecha_inicio, fecha_fin, id_cuota_categoria (que sí existen)
    await sequelize.query(`
      UPDATE categoria SET fecha_inicio = NULL, fecha_fin = NULL, id_cuota_categoria = NULL
      WHERE id_categoria IN (
        SELECT id_categoria FROM categoria
        WHERE nombre IN ('0300 - 1000-CAFES', '0700 - 1000-CULINARIOS', '1201 - 1000-GALLETAS',
                         '1500 - 1000-LACTEOS CULINARIOS', '1750 - 1000-MODIFICADOR DE LECHE',
                         '2061 - 1000-RTD', '0401 - 1000-CPW', '0350 - 1000-CEREALES INFANTILES',
                         '1100 - 1000-FORMULAS INFANTILES', '1250 - 1000-GUMS', '0101 - 1000-COMPOTAS',
                         '2950 - 2500-CHOCOLATES')
      )
    `);

    console.log('✅ Categorías limpiadas (fecha_inicio, fecha_fin, id_cuota_categoria = NULL)');

    // Limpiar cuotaCategoria (eliminar cuotas globales incorrectas)
    await sequelize.query(`
      DELETE FROM "cuotaCategoria"
      WHERE fecha_inicio = '2026-03-01' AND fecha_fin = '2026-03-31'
    `);

    console.log('✅ cuotaCategoria limpiada\n');

    console.log('⚠️  AHORA RECARGA EL CSV para que se guarden correctamente las cuotas POR CATEGORÍA\n');

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
