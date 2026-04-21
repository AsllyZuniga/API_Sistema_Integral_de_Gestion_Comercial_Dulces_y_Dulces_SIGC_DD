const ImportadorVentas = require('../services/importventas');

// Crear una instancia sin modelos, solo para probar las funciones de parsing
const methods = {
    separarCodigoNombre(texto) {
        if (!texto) return { codigo: null, nombre: null };
        const partes = texto.split('-').map(p => p.trim());
        if (partes.length >= 2) {
            return {
                codigo: partes[0],
                nombre: partes.slice(1).join('-')
            };
        }
        return { codigo: null, nombre: texto };
    },

    separarTipoDocumento(nroDocumento) {
        if (!nroDocumento || nroDocumento.trim() === '') return { nombre: null, consecutivo: null };
        const partes = nroDocumento.trim().split('-');
        if (partes.length === 2) {
            return {
                nombre: partes[0].trim(),
                consecutivo: parseInt(partes[1], 10) || null
            };
        }
        return { nombre: nroDocumento.trim(), consecutivo: null };
    }
};

console.log('Testing separarCodigoNombre:\n');

const casos = [
    "625 - BELLEZA EXPRESS",
    "790 - NEWELL BRANDS",
    "880 - ENERGIZER",
    "040 - MONDELEZ"
];

casos.forEach(caso => {
    const resultado = methods.separarCodigoNombre(caso);
    console.log(`Input: "${caso}"`);
    console.log(`  Código: "${resultado.codigo}"`);
    console.log(`  Nombre: "${resultado.nombre}"`);
    console.log();
});

console.log('\nTesting separarTipoDocumento:\n');

const casos2 = [
    "FE1-00391434",
    "FE1-00388011",
    "FE1-00383010"
];

casos2.forEach(caso => {
    const resultado = methods.separarTipoDocumento(caso);
    console.log(`Input: "${caso}"`);
    console.log(`  Nombre: "${resultado.nombre}"`);
    console.log(`  Consecutivo: ${resultado.consecutivo}`);
    console.log();
});

process.exit(0);
