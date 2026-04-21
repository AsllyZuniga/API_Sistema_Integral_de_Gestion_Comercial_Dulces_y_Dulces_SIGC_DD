#!/usr/bin/env node

const { sequelize } = require('./models');

async function fixAllDuplicatesGlobal() {
    try {
        console.log('🔧 LIMPIANDO TODOS LOS DUPLICADOS DE CATEGORÍAS EN BD...\n');

        // 1. Encontrar todos los duplicados
        const duplicados = await sequelize.query(`
            SELECT nombre, COUNT(*) as cnt, MIN(id_categoria) as id_mantener
            FROM categoria
            GROUP BY nombre
            HAVING COUNT(*) > 1
        `, { type: sequelize.QueryTypes.SELECT });

        if (duplicados.length === 0) {
            console.log('✅ No hay categorías duplicadas\n');
            return;
        }

        console.log(`📊 Encontrados ${duplicados.length} nombres duplicados (${duplicados.reduce((acc, d) => acc + (d.cnt - 1), 0)} duplicados)\n`);

        let totalActualizadas = 0;
        let totalEliminadas = 0;

        // 2. Para cada duplicado
        for (const dup of duplicados) {
            console.log(`\n🔍 Procesando: "${dup.nombre}"`);
            
            // Obtener todos los IDs
            const ids = await sequelize.query(`
                SELECT id_categoria 
                FROM categoria 
                WHERE nombre = :nombre
                ORDER BY id_categoria ASC
            `, { 
                replacements: { nombre: dup.nombre },
                type: sequelize.QueryTypes.SELECT 
            });

            const idsAEliminar = ids.filter(r => r.id_categoria !== dup.id_mantener).map(r => r.id_categoria);
            
            console.log(`   IDs: ${ids.map(r => r.id_categoria).join(', ')} → Mantener: ${dup.id_mantener}, Eliminar: ${idsAEliminar.join(', ')}`);

            // Actualizar referencias
            for (const idViejo of idsAEliminar) {
                // subcategoria
                const scUpdated = await sequelize.query(`
                    UPDATE subcategoria 
                    SET id_categoria = :idMantener 
                    WHERE id_categoria = :idViejo
                `, { 
                    replacements: { idMantener: dup.id_mantener, idViejo },
                    type: sequelize.QueryTypes.UPDATE 
                });
                
                // item
                const itUpdated = await sequelize.query(`
                    UPDATE item 
                    SET id_categoria = :idMantener 
                    WHERE id_categoria = :idViejo
                `, { 
                    replacements: { idMantener: dup.id_mantener, idViejo },
                    type: sequelize.QueryTypes.UPDATE 
                });

                totalActualizadas += (scUpdated[1] || 0) + (itUpdated[1] || 0);
            }

            // Eliminar filas duplicadas
            if (idsAEliminar.length > 0) {
                const placeholders = idsAEliminar.map((_, i) => `:id${i}`).join(',');
                const replacements = {};
                idsAEliminar.forEach((id, i) => {
                    replacements[`id${i}`] = id;
                });

                const result = await sequelize.query(`
                    DELETE FROM categoria 
                    WHERE id_categoria IN (${placeholders})
                `, { 
                    replacements,
                    type: sequelize.QueryTypes.DELETE 
                });

                totalEliminadas += idsAEliminar.length;
                console.log(`   ✅ Actualizadas referencias + eliminadas ${idsAEliminar.length} filas duplicadas`);
            }
        }

        console.log(`\n✅ LIMPIEZA COMPLETADA:`);
        console.log(`   - Referencias actualizadas: ${totalActualizadas}`);
        console.log(`   - Categorías duplicadas eliminadas: ${totalEliminadas}`);

        // 3. Verificar que no quedan duplicados
        const checkFinal = await sequelize.query(`
            SELECT COUNT(*) as cnt 
            FROM (
                SELECT nombre, COUNT(*) 
                FROM categoria 
                GROUP BY nombre 
                HAVING COUNT(*) > 1
            ) sub
        `, { type: sequelize.QueryTypes.SELECT });

        const dupsFinal = checkFinal[0]?.cnt || 0;
        if (dupsFinal === 0) {
            console.log(`   ✅ Verificación: 0 duplicados restantes\n`);
        } else {
            console.log(`   ⚠️  Aún hay ${dupsFinal} duplicados (esto no debería ocurrir)\n`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

fixAllDuplicatesGlobal().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
