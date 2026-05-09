/**
 * Diagnóstico: Comparar proveedores del CSV con la BD
 * Identifica qué nombres del CSV no están encontrando coincidencia en la BD
 */

const models = require('./models');

async function diagnostic() {
    try {
        console.log('🔍 Analizando discrepancias de proveedores...\n');

        // Proveedores que el CSV espera (de la fila del vendedor 0550)
        const proveedoresCSV = [
            'ARCOR', 'TONING', 'INCODEPF', 'ITALO', 'ALICORP ALIMENTOS', 'CONFITECA', 
            'FLORA FOOD', 'EL REY', 'LEVAPAN', 'SUPER', 'HENKEL', 'RECAMIER', 'PREBEL', 
            'ENERGIZER', 'COFARMA', 'SAN JORGE VELAS Y VELONES', 'BELLEZA EXPRESS', 
            'LA CORUÑA', 'KATORI', 'SIEGFRIED', 'BAYER', 'HALEON', 'MONDELEZ', 'ALDOR', 
            'FONANDES', 'DANISCO', 'CALA', 'JOHNSON Y JOHNSON', 'SANUSS', 'KELLOGGS', 
            'MULTIDIMENSIONALES', 'LAB. OSA', 'FINI'
        ];

        // Cargar todos los proveedores de la BD
        const proveedoresBD = await models.proveedor_model.findAll({
            attributes: ['id_proveedor', 'nombre', 'codigo'],
            raw: true
        });

        console.log(`📊 Proveedores en BD: ${proveedoresBD.length}`);
        console.log(`📊 Proveedores en CSV: ${proveedoresCSV.length}\n`);

        // Normalizar función
        function normalizeProveedorName(value) {
            return String(value ?? '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .toUpperCase();
        }

        // Mapear proveedores BD por nombre normalizado
        const mapBDNormalizado = new Map();
        proveedoresBD.forEach(p => {
            const norm = normalizeProveedorName(p.nombre);
            if (!mapBDNormalizado.has(norm)) {
                mapBDNormalizado.set(norm, p);
            }
        });

        console.log('=== COINCIDENCIAS ENCONTRADAS ===\n');
        const encontrados = [];
        const noEncontrados = [];

        for (const nombreCSV of proveedoresCSV) {
            const norm = normalizeProveedorName(nombreCSV);
            const proveedor = mapBDNormalizado.get(norm);
            
            if (proveedor) {
                encontrados.push({
                    csv: nombreCSV,
                    bd: proveedor.nombre,
                    id: proveedor.id_proveedor,
                    codigo: proveedor.codigo
                });
            } else {
                noEncontrados.push(nombreCSV);
            }
        }

        // Mostrar encontrados
        if (encontrados.length > 0) {
            console.log(`✅ ${encontrados.length} PROVEEDORES ENCONTRADOS:\n`);
            encontrados.forEach(e => {
                console.log(`  CSV: "${e.csv}"`);
                console.log(`  BD:  "${e.bd}" (ID: ${e.id}, código: ${e.codigo})\n`);
            });
        }

        // Mostrar NO encontrados
        console.log(`\n=== PROVEEDORES NO ENCONTRADOS (${noEncontrados.length}) ===\n`);
        if (noEncontrados.length > 0) {
            noEncontrados.forEach((nombre, idx) => {
                console.log(`${idx + 1}. "${nombre}"`);
                
                // Buscar similitudes en la BD
                const similares = proveedoresBD.filter(p => {
                    const normBD = normalizeProveedorName(p.nombre);
                    const normCSV = normalizeProveedorName(nombre);
                    // Ver si comparten palabras clave
                    const palabrasCSV = normCSV.split(' ');
                    const palabrasBD = normBD.split(' ');
                    const comunes = palabrasCSV.filter(p => palabrasBD.includes(p));
                    return comunes.length > 0;
                });

                if (similares.length > 0) {
                    console.log(`   🔶 POSIBLES COINCIDENCIAS:\n`);
                    similares.forEach(s => {
                        console.log(`      - "${s.nombre}" (ID: ${s.id_proveedor}, código: ${s.codigo})`);
                    });
                } else {
                    console.log(`   ❌ SIN COINCIDENCIAS PARCIALES`);
                }
                console.log();
            });
        }

        // Resumen
        console.log(`\n=== RESUMEN ===`);
        console.log(`✅ Encontrados:     ${encontrados.length}/${proveedoresCSV.length}`);
        console.log(`❌ No encontrados:  ${noEncontrados.length}/${proveedoresCSV.length}`);
        console.log(`📊 Cobertura:       ${((encontrados.length / proveedoresCSV.length) * 100).toFixed(1)}%`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

diagnostic();
