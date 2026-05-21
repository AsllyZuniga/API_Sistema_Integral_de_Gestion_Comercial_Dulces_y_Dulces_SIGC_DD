#!/usr/bin/env node
/**
 * Script de Validación: Endpoint /lineas
 * Verifica que TODOS los proveedores con cuota aparezcan en el resultado
 */

const fs = require('fs');
const path = require('path');

// Simular los datos del CSV
const csvData = `codigo_vendedor,nombre_vendedor,ARCOR,TONING,INCODEPF,ITALO,ALICORP ALIMENTOS,CONFITECA,FLORA FOOD,EL REY,LEVAPAN,SUPER,HENKEL,RECAMIER,PREBEL,ENERGIZER,COFARMA,SAN JORGE VELAS Y VELONES,BELLEZA EXPRESS,LA CORUNA,KATORI,SIEGFRIED,BAYER,HALEON,MONDELEZ,ALDOR,FONANDES,DANISCO,CALA,JOHNSON Y JOHNSON,SANUSS,KELLOGGS,MULTIDIMENSIONALES,LAB. OSA,FINI,fechaInicio,fechaFin
0001, FAJARDO RIVAS JAVIER ESTEBAN ,1850601,1576860,2535815,1020327,1714217,1000000,900000,6857384,3552930,9940333,862655,800000,800000,1000000,800000,2068736,800000,433171,500000,1109839,1677668,1976101,2866628,3300000,2000000,276941,1000000,3900000,2500000,1500000,1500000,3000000,1245337,2026-01-01,2026-01-31`;

// Parsear CSV
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim());
const values = lines[1].split(',').map(v => v.trim());

// Extractar proveedores (columnas 2 a 34, excluyendo codigo_vendedor, nombre_vendedor, fechaInicio, fechaFin)
const proveedoresIndices = headers.slice(2, -2); // Excluir codigo_vendedor, nombre_vendedor, fechaInicio, fechaFin
const cuotasMap = {};

proveedoresIndices.forEach((proveedor, i) => {
    const cuota = parseInt(values[i + 2], 10); // Offset por codigo_vendedor y nombre_vendedor
    if (!cuotasMap[proveedor]) {
        cuotasMap[proveedor] = 0;
    }
    cuotasMap[proveedor] += cuota;
});

console.log('\n=== VALIDACIÓN: PROVEEDORES CON CUOTA ===\n');
console.log('Proveedores esperados en el resultado (según CSV):\n');

const sortedProveedores = Object.entries(cuotasMap)
    .sort(([, a], [, b]) => b - a);

sortedProveedores.forEach(([proveedor, cuota], idx) => {
    console.log(`${idx + 1}. ${proveedor.padEnd(40)} -> ${cuota.toLocaleString('es-CO')}`);
});

console.log(`\n✅ Total de proveedores esperados: ${sortedProveedores.length}`);
console.log(`💰 Suma total de cuotas: ${Object.values(cuotasMap).reduce((a, b) => a + b, 0).toLocaleString('es-CO')}`);

// Identificar proveedores con cuota > 0
const conCuota = sortedProveedores.filter(([, cuota]) => cuota > 0);
const sinCuota = sortedProveedores.filter(([, cuota]) => cuota === 0);

console.log(`\n📊 Estadísticas:`);
console.log(`   • Con cuota (> 0): ${conCuota.length}`);
console.log(`   • Sin cuota (0): ${sinCuota.length}`);

if (sinCuota.length > 0) {
    console.log(`\n⚠️  Proveedores sin cuota:`);
    sinCuota.forEach(([proveedor]) => {
        console.log(`   • ${proveedor}`);
    });
}

console.log('\n✨ INSTRUCCIONES DE VALIDACIÓN EN POSTMAN:\n');
console.log('1. GET http://localhost:3000/mes/cumplimiento/lineas?fechaInicio=2026-01-01&fechaFin=2026-01-31');
console.log('2. Verificar que en la respuesta.detallePorLinea aparezcan TODOS los proveedores listados arriba');
console.log('3. Comparar cuotas: cuotaProveedorTotal debe coincidir con las del CSV');
console.log('\n=== FIN DE VALIDACIÓN ===\n');
