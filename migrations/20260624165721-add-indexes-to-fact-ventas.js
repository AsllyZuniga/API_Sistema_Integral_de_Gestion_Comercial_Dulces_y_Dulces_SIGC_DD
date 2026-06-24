'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('=== Creando índices en fact_ventas para acelerar DELETE por rango de fechas ===');

        // Los índices permiten que el DELETE de adminVentasService use index scans
        // en lugar de sequential scans sobre los 749K registros.
        // Sin estos índices, eliminar febrero tarda 3-8 min; con ellos, ~10-30 seg.
        //
        // Usamos CREATE INDEX (no CONCURRENTLY) porque se asume que la migración
        // se ejecuta en una ventana de mantenimiento. Si necesitas cero-downtime,
        // cambia a queryInterface.addIndex con la opción `concurrently: true`
        // (requiere ejecutar la migración fuera de transacción).

        const indexes = [
            { columns: ['id_venta'], name: 'idx_fact_ventas_id_venta' },
            { columns: ['id_detalle'], name: 'idx_fact_ventas_id_detalle' }
        ];

        for (const idx of indexes) {
            const exists = await queryInterface.sequelize.query(
                `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'fact_ventas' AND indexname = :name`,
                { replacements: { name: idx.name }, type: Sequelize.QueryTypes.SELECT }
            );
            if (exists.length === 0) {
                console.log(`  → Creando índice ${idx.name} (${idx.columns.join(', ')})...`);
                const t0 = Date.now();
                await queryInterface.addIndex('fact_ventas', idx.columns, { name: idx.name });
                console.log(`  ✓ Índice ${idx.name} creado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
            } else {
                console.log(`  ⚠ Índice ${idx.name} ya existe, omitiendo`);
            }
        }

        console.log('=== ✅ Índices creados exitosamente ===');
    },

    async down(queryInterface, Sequelize) {
        console.log('=== Eliminando índices de fact_ventas ===');
        const indexes = ['idx_fact_ventas_id_venta', 'idx_fact_ventas_id_detalle'];
        for (const name of indexes) {
            await queryInterface.removeIndex('fact_ventas', name);
            console.log(`  ✓ Índice ${name} eliminado`);
        }
    }
};
