#!/usr/bin/env node

/**
 * Script para debugar el mapeo de columnas en la importación de ventas
 * 
 * Uso:
 *   node scripts/debugMapeoColumnas.js <ruta-archivo-tsv> [numero-fila]
 * 
 * Ejemplos:
 *   node scripts/debugMapeoColumnas.js ./ventastest.txt 2
 *   node scripts/debugMapeoColumnas.js ./ventastest.txt
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const args = process.argv.slice(2);
let rutaArchivo = args[0];
let numeroFilaDeseada = parseInt(args[1]) || 2; // Por defecto mostrar fila 2

if (!rutaArchivo) {
    console.error('❌ Debes proporcionar una ruta al archivo TSV');
    console.error('Uso: node scripts/debugMapeoColumnas.js <archivo-tsv> [numero-fila]');
    process.exit(1);
}

const rutaAbsoluta = path.resolve(rutaArchivo);

if (!fs.existsSync(rutaAbsoluta)) {
    console.error(`❌ Archivo no encontrado: ${rutaAbsoluta}`);
    process.exit(1);
}

async function debugearMapeo() {
    const fileStream = fs.createReadStream(rutaAbsoluta, { encoding: 'utf8' });
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let numeroFila = 0;
    let encabezados = [];
    let filaEncontrada = null;

    console.log(`\n📋 Analizando archivo: ${rutaAbsoluta}`);
    console.log(`🔍 Buscando fila #${numeroFilaDeseada}\n`);

    for await (const linea of rl) {
        if (numeroFila === 0) {
            // Procesar encabezados
            encabezados = linea.split('\t').map(h => h.trim());
            console.log('=' .repeat(100));
            console.log('ENCABEZADOS DETECTADOS:');
            console.log('=' .repeat(100));
            encabezados.forEach((enc, idx) => {
                console.log(`${(idx + 1).toString().padStart(2)}: "${enc}"`);
            });
            console.log('=' .repeat(100) + '\n');
            numeroFila++;
            continue;
        }

        if (numeroFila === numeroFilaDeseada) {
            filaEncontrada = linea;
            break;
        }

        numeroFila++;
    }

    if (!filaEncontrada) {
        console.error(`❌ No se encontró la fila #${numeroFilaDeseada}`);
        process.exit(1);
    }

    // Procesar la fila encontrada
    const valores = filaEncontrada.split('\t');
    const registro = {};
    
    encabezados.forEach((encabezado, index) => {
        registro[encabezado] = valores[index] ? valores[index].trim() : '';
    });

    console.log(`\n📌 FILA #${numeroFilaDeseada} - MAPEO DETALLADO\n`);
    console.log('=' .repeat(100));

    // Mostrar cada columna con su valor
    encabezados.forEach((encabezado, idx) => {
        const valor = registro[encabezado];
        const esVacio = !valor || valor === '';
        console.log(`\n[${(idx + 1).toString().padStart(2)}] "${encabezado}"`);
        console.log(`     Valor: ${esVacio ? '❌ VACÍO' : `"${valor}"`}`);
    });

    console.log('\n' + '=' .repeat(100));

    // Sección de campos críticos para la importación
    console.log('\n\n🔑 CAMPOS CRÍTICOS PARA LA IMPORTACIÓN:\n');
    
    const camposCriticos = [
        { nombre: 'LINEA (Proveedor)', campo: 'LINEA' },
        { nombre: 'MEGACATEGORIA', campo: 'MEGACATEGORIA' },
        { nombre: 'CATEGORIA', campo: 'CATEGORIA' },
        { nombre: 'SUBCATEGORIA', campo: 'SUBCATEGORIA' },
        { nombre: 'CANAL', campo: 'CANAL' },
        { nombre: 'SUBCANAL', campo: 'SUBCANAL' },
        { nombre: 'Desc. ciudad', campo: 'Desc. ciudad' },
        { nombre: 'Barrio', campo: 'Barrio' },
        { nombre: 'TIPO DE NEGOCIO', campo: 'TIPO DE NEGOCIO' },
        { nombre: 'DETALLE TIPO DE NEGOCIO', campo: 'DETALLE TIPO DE NEGOCIO' },
        { nombre: 'Cliente factura', campo: 'Cliente factura' },
        { nombre: 'Razon social cliente factura', campo: 'Razon social cliente factura' },
        { nombre: 'Nombre establecimiento  facturar ⚠️', campo: 'Nombre establecimiento  facturar' },
        { nombre: 'Codigo vendedor', campo: 'Codigo vendedor' },
        { nombre: 'Nombre vendedor', campo: 'Nombre vendedor' },
        { nombre: 'Item', campo: 'Item' },
        { nombre: 'Desc. item', campo: 'Desc. item' },
        { nombre: 'Fecha', campo: 'Fecha' },
        { nombre: 'Nro documento', campo: 'Nro documento' },
        { nombre: 'Valor bruto', campo: 'Valor bruto' },
        { nombre: 'Valor impuestos', campo: 'Valor impuestos' },
        { nombre: 'Valor neto', campo: 'Valor neto' },
        { nombre: 'Cantidad', campo: 'Cantidad' },
        { nombre: 'Cantidad emp.', campo: 'Cantidad emp.' },
        { nombre: 'Costo promedio total', campo: 'Costo promedio total' },
        { nombre: 'Valor subtotal', campo: 'Valor subtotal' },
    ];

    camposCriticos.forEach(({ nombre, campo }) => {
        const existe = encabezados.includes(campo);
        const valor = registro[campo];
        const esVacio = !valor || valor === '';
        
        const estado = existe ? (esVacio ? '⚠️  EXISTE pero VACÍO' : '✅ OK') : '❌ NO EXISTE';
        
        console.log(`${estado} | ${nombre}`);
        if (existe && valor) {
            console.log(`         └─ Valor: "${valor}"`);
        }
    });

    console.log('\n' + '=' .repeat(100));
    console.log('\n⚠️  NOTA: Se detectó que "Nombre establecimiento  facturar" tiene 2 espacios antes de "facturar"');
    console.log('   Asegúrate que el código está buscando exactamente: "Nombre establecimiento  facturar"\n');
}

debugearMapeo().catch(console.error);
