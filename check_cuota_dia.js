require('dotenv').config();
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    console.log('=== VERIFICACIÓN DE CUOTA DIARIA ===\n');

    // 1. Total de cuotas en la BD
    const total = await sequelize.query(
      'SELECT COUNT(*) as total_cuotas, SUM(cuota_dia) as suma_cuotas FROM "cuotaDia"',
      { type: QueryTypes.SELECT }
    );
    console.log('1. Total de cuotas en BD:', JSON.stringify(total[0], null, 2));

    // 2. Rango de fechas
    const rango = await sequelize.query(
      'SELECT MIN(fecha_fin) as min_fecha, MAX(fecha_fin) as max_fecha FROM "cuotaDia"',
      { type: QueryTypes.SELECT }
    );
    console.log('\n2. Rango de fechas:', JSON.stringify(rango[0], null, 2));

    // 3. Cuotas para 2026-04-01
    const abril = await sequelize.query(
      `SELECT COUNT(*) as total, SUM(cuota_dia) as suma FROM "cuotaDia" 
       WHERE fecha_fin = '2026-04-01'`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n3. Cuotas para 2026-04-01:', JSON.stringify(abril[0], null, 2));

    // 4. Sample de datos
    const sample = await sequelize.query(
      `SELECT id_cuotaDia, cuota_dia, fecha_inicio, fecha_fin, id_usuario 
       FROM "cuotaDia" WHERE fecha_fin = '2026-04-01' LIMIT 10`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n4. Sample de cuotas para 2026-04-01:');
    console.log(JSON.stringify(sample, null, 2));

    // 5. Verificar relación vendedor-usuario-cuotaDia
    const relacion = await sequelize.query(
      `SELECT 
        vd.id_vendedor, vd.nombre, vd.id_usuario,
        COUNT(cd.id_cuotaDia) as cuotas_count,
        SUM(cd.cuota_dia) as cuota_total
       FROM vendedor vd
       LEFT JOIN "cuotaDia" cd ON cd.id_usuario = vd.id_usuario AND cd.fecha_fin = '2026-04-01'
       GROUP BY vd.id_vendedor, vd.nombre, vd.id_usuario
       LIMIT 10`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n5. Relación vendedor-cuotaDia (sample):');
    console.log(JSON.stringify(relacion, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
