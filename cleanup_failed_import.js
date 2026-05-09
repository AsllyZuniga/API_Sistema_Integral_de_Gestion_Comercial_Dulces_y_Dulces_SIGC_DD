/**
 * Script para limpiar la importación fallida de cuotas de proveedores
 * Elimina TODOS los registros de enero para poder reimportar limpiamente
 */

const { sequelize } = require('./models');

async function cleanup() {
    try {
        console.log('🧹 Limpiando importación de enero 2026...\n');

        // 1. Contar registros antes
        const countBefore = await sequelize.query(`
            SELECT COUNT(*) as cnt FROM "cuotaProveedor" 
            WHERE fecha_inicio = '2026-01-01' AND fecha_fin = '2026-01-31'
        `, { type: sequelize.QueryTypes.SELECT });
        console.log(`📊 Cuotas de enero ANTES: ${countBefore[0]?.cnt || 0}`);

        // 2. Eliminar asignaciones de enero
        const deleteAsignaciones = await sequelize.query(`
            DELETE FROM "vendedorCuotaProveedor" vcp
            WHERE vcp."id_cuotaProveedor" IN (
                SELECT "id_cuotaProveedor" FROM "cuotaProveedor" cp
                WHERE cp.fecha_inicio = '2026-01-01' AND cp.fecha_fin = '2026-01-31'
            )
        `);
        console.log(`✅ Asignaciones eliminadas: ${deleteAsignaciones[1]?.rowCount || 0}`);

        // 3. Eliminar cuotas de enero
        const deleteCuotas = await sequelize.query(`
            DELETE FROM "cuotaProveedor" cp
            WHERE cp.fecha_inicio = '2026-01-01' AND cp.fecha_fin = '2026-01-31'
        `);
        console.log(`✅ Cuotas eliminadas: ${deleteCuotas[1]?.rowCount || 0}`);

        // 4. Verificar
        const countAfter = await sequelize.query(`
            SELECT COUNT(*) as cnt FROM "cuotaProveedor" 
            WHERE fecha_inicio = '2026-01-01' AND fecha_fin = '2026-01-31'
        `, { type: sequelize.QueryTypes.SELECT });
        console.log(`\n📊 Cuotas de enero DESPUÉS: ${countAfter[0]?.cnt || 0}`);

        console.log('\n✅ Limpieza completada. Ahora puedes reimportar el archivo.');
        console.log('📝 Usa Postman o curl para reimportar con las fechas 2026-01-01 a 2026-01-31');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanup();
