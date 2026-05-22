/**
 * Prueba: Verificar que el nuevo mapeo de proveedores encuentra los 33 del CSV
 */

const models = require('./models');

// Copiar las funciones normalizadoras
function normalizeProveedorName(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function normalizeCompact(value) {
    return normalizeProveedorName(value).replace(/\s+/g, '');
}

function getProveedorAliasCandidates(value) {
    const raw = normalizeProveedorName(value);
    if (!raw) return [];

    const aliases = new Set([raw]);

    // Mapeo explícito de alias
    const aliasMap = {
        ALICORP: ['ALICORP ALIMENTOS'],
        UPFIELD: ['TONING'],
        'SAN JORGE': ['SAN JORGE VELAS Y VELONES'],
        'LA CORUNA': ['LA CORU A'],
        JOHNSON: ['JOHNSON Y JOHNSON'],
        OSA: ['LAB OSA'],
        COFARMA: ['LAB COFARMA'],
        KELLOGGS: ['KELLOGG']
    };

    if (aliasMap[raw]) {
        aliasMap[raw].forEach(a => aliases.add(normalizeProveedorName(a)));
    }

    // Variantes comunes de encabezados de cuotas vs. catálogo proveedor
    if (raw === 'REY') aliases.add('EL REY');
    if (raw === 'COFARMA') {
        aliases.add('LAB COFARMA');
        aliases.add('LAB. COFARMA');
    }
    if (raw === 'KELLOGGS') {
        aliases.add('KELLOGG');
        aliases.add(raw.slice(0, -1)); // KELLOGG sin la S
    }
    if (raw === 'HALEON') aliases.add('HALEON');

    // Intentar singular/plural simple (KELLOGGS <-> KELLOGG)
    if (raw.length > 4 && raw.endsWith('S')) aliases.add(raw.slice(0, -1));

    // Quitar artículos opcionales
    if (raw.startsWith('EL ')) aliases.add(raw.slice(3));
    if (raw.startsWith('LA ')) aliases.add(raw.slice(3));

    return [...aliases].filter(Boolean);
}

async function test() {
    try {
        console.log('🔍 Probando nuevo mapeo de proveedores...\n');

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

        // Mapear proveedores BD por nombre normalizado
        const mapBDNormalizado = new Map();
        proveedoresBD.forEach(p => {
            const norm = normalizeProveedorName(p.nombre);
            if (!mapBDNormalizado.has(norm)) {
                mapBDNormalizado.set(norm, p);
            }
            // También por código normalizado
            const codigoNorm = normalizeProveedorName(p.codigo);
            if (codigoNorm && !mapBDNormalizado.has(codigoNorm)) {
                mapBDNormalizado.set(codigoNorm, p);
            }
        });

        console.log(`📊 BD tiene ${proveedoresBD.length} proveedores (mapa optimizado con ${mapBDNormalizado.size} claves)\n`);

        console.log('=== PRUEBA DE NUEVO MAPEO ===\n');
        const encontrados = [];
        const noEncontrados = [];

        for (const nombreCSV of proveedoresCSV) {
            const candidates = getProveedorAliasCandidates(nombreCSV);
            const proveedor = candidates
                .map(candidate => mapBDNormalizado.get(candidate))
                .find(Boolean);

            console.log(`📍 CSV: "${nombreCSV}"`);
            console.log(`   Candidatos: [${candidates.map(c => `"${c}"`).join(', ')}]`);
            
            if (proveedor) {
                console.log(`   ✅ ENCONTRADO: "${proveedor.nombre}" (ID: ${proveedor.id_proveedor}, código: ${proveedor.codigo})\n`);
                encontrados.push({
                    csv: nombreCSV,
                    bd: proveedor.nombre,
                    id: proveedor.id_proveedor
                });
            } else {
                console.log(`   ❌ NO ENCONTRADO\n`);
                noEncontrados.push(nombreCSV);
            }
        }

        // Resumen
        console.log(`\n=== RESUMEN ===`);
        console.log(`✅ Encontrados:     ${encontrados.length}/${proveedoresCSV.length}`);
        console.log(`❌ No encontrados:  ${noEncontrados.length}/${proveedoresCSV.length}`);
        console.log(`📊 Cobertura:       ${((encontrados.length / proveedoresCSV.length) * 100).toFixed(1)}%`);

        if (noEncontrados.length > 0) {
            console.log(`\n❌ Proveedores faltantes:`);
            noEncontrados.forEach(p => console.log(`   - ${p}`));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

test();
