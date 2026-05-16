const { Sequelize } = require('sequelize');
const fs = require('fs');

// Leer configuración
const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
const dbConfig = config.development;

// Conectar a BD
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        dialectOptions: dbConfig.dialectOptions,
        logging: false
    }
);

async function verificarVendedor0550() {
    try {
        console.log('\n========== VERIFICACIÓN VENDEDOR 0550 ==========\n');

        // 1. Obtener ID del vendedor 0550
        const vendedor = await sequelize.query(
            `SELECT id_vendedor, codigo_vendedor, nombre 
             FROM vendedor 
             WHERE codigo_vendedor = '0550'`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (vendedor.length === 0) {
            console.log('❌ Vendedor 0550 NO ENCONTRADO en BD');
            return;
        }

        const idVendedor = vendedor[0].id_vendedor;
        console.log(`✅ Vendedor encontrado: ${vendedor[0].nombre} (ID: ${idVendedor})\n`);

        // 2. Verificar cuotas en vendedorCuotaProveedor
        console.log('=== CUOTAS EN TABLA: vendedorCuotaProveedor ===\n');
        const cuotasProveedor = await sequelize.query(
            `SELECT 
                p.nombre AS proveedor,
                cp.cuota
             FROM "vendedorCuotaProveedor" vcp
             JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
             JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
             WHERE vcp.id_vendedor = ${idVendedor}
             ORDER BY p.nombre`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (cuotasProveedor.length > 0) {
            console.log(`Encontradas ${cuotasProveedor.length} cuotas de PROVEEDOR:\n`);
            cuotasProveedor.forEach(row => {
                console.log(`  • ${row.proveedor}: $${Number(row.cuota).toLocaleString()}`);
            });
            const sumaProveedor = cuotasProveedor.reduce((sum, r) => sum + Number(r.cuota), 0);
            console.log(`\n  📊 TOTAL PROVEEDOR: $${sumaProveedor.toLocaleString()}\n`);
        } else {
            console.log('❌ NO hay cuotas en vendedor_cuota_proveedor\n');
        }

        // 3. Verificar cuotas en vendedorCuotaCategoria
        console.log('=== CUOTAS EN TABLA: vendedorCuotaCategoria ===\n');
        let cuotasCategoria = [];
        try {
            cuotasCategoria = await sequelize.query(
                `SELECT 
                    cat.id_categoria,
                    cat.nombre AS categoria,
                    vqc.cuota
                 FROM "vendedorCuotaCategoria" vqc
                 JOIN categoria cat ON cat.id_categoria = vqc.id_categoria
                 WHERE vqc.id_vendedor = ${idVendedor}
                 ORDER BY cat.nombre`,
                { type: Sequelize.QueryTypes.SELECT }
            );
        } catch (err) {
            console.log(`⚠️  Tabla "vendedorCuotaCategoria" no existe o error: ${err.message}`);
            console.log(`   Esto confirma que NO hay cuotas de categoría en la BD para este vendedor.\n`);
        }

        if (cuotasCategoria.length > 0) {
            console.log(`Encontradas ${cuotasCategoria.length} cuotas de CATEGORÍA:\n`);
            cuotasCategoria.forEach(row => {
                console.log(`  • ${row.id_categoria} - ${row.categoria}: $${Number(row.cuota).toLocaleString()}`);
            });
            const sumaCategoria = cuotasCategoria.reduce((sum, r) => sum + Number(r.cuota), 0);
            console.log(`\n  📊 TOTAL CATEGORÍA: $${sumaCategoria.toLocaleString()}\n`);
        } else {
            console.log('❌ NO hay cuotas en vendedor_cuota_categoria\n');
        }

        // 4. Identificar proveedores SIN mapeo a categorías
        console.log('=== ANÁLISIS DE DISCREPANCIA ===\n');
        const proveedoresSinMapeo = cuotasProveedor.filter(p => 
            !cuotasCategoria.some(c => 
                c.categoria.toLowerCase() === p.proveedor.toLowerCase()
            )
        );

        if (proveedoresSinMapeo.length > 0) {
            console.log(`❌ ${proveedoresSinMapeo.length} PROVEEDORES SIN MAPEO A CATEGORÍA:\n`);
            proveedoresSinMapeo.forEach(row => {
                console.log(`  • ${row.proveedor}: $${Number(row.cuota).toLocaleString()}`);
            });
            const sumaSinMapeo = proveedoresSinMapeo.reduce((sum, r) => sum + Number(r.cuota), 0);
            console.log(`\n  💰 SUMA SIN MAPEO: $${sumaSinMapeo.toLocaleString()}`);
        } else {
            console.log('✅ Todos los proveedores tienen mapeo a categoría\n');
        }

        console.log('\n========== FIN VERIFICACIÓN ==========\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

verificarVendedor0550();
