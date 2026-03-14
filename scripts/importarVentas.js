#!/usr/bin/env node

/**
 * Script CLI para importación masiva de ventas
 * 
 * Uso:
 *   node scripts/importarVentas.js <ruta-archivo-tsv>
 *   node scripts/importarVentas.js --archivo=ventastest.txt
 * 
 * Ejemplos:
 *   node scripts/importarVentas.js ./ventastest.txt
 *   node scripts/importarVentas.js /home/usuario/mitad1.txt --batch=50
 *   node scripts/importarVentas.js ./ventas.txt --verbose
 */

const path = require('path');
require('dotenv').config();
const models = require('../models');
const ImportadorVentas = require('../services/importventas');

// Colores para consola
const colores = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function error(mensaje) {
    console.log(`${colores.red}${colores.bright}❌ Error: ${mensaje}${colores.reset}`);
}

function exito(mensaje) {
    console.log(`${colores.green}${colores.bright}✅ ${mensaje}${colores.reset}`);
}

function info(mensaje) {
    console.log(`${colores.cyan}ℹ️  ${mensaje}${colores.reset}`);
}

function advertencia(mensaje) {
    console.log(`${colores.yellow}⚠️  ${mensaje}${colores.reset}`);
}

async function main() {
    try {
        // Parsear argumentos
        const args = process.argv.slice(2);
        let rutaArchivo = null;
        let batchSize = 100;
        let verbose = false;

        for (const arg of args) {
            if (arg.startsWith('--archivo=')) {
                rutaArchivo = arg.replace('--archivo=', '');
            } else if (arg.startsWith('--batch=')) {
                batchSize = parseInt(arg.replace('--batch=', ''), 10);
            } else if (arg === '--verbose') {
                verbose = true;
            } else if (!arg.startsWith('--')) {
                rutaArchivo = arg;
            }
        }

        // Validar ruta
        if (!rutaArchivo) {
            error('Debes proporcionar una ruta a un archivo TSV');
            console.log(`
${colores.cyan}${colores.bright}Uso:${colores.reset}
  node scripts/importarVentas.js <ruta-archivo>
  
${colores.cyan}${colores.bright}Opciones:${colores.reset}
  --batch=N          Tamaño del batch (default: 100)
  --verbose          Salida detallada
  --archivo=RUTA     Especificar ruta (alternativa)

${colores.cyan}${colores.bright}Ejemplos:${colores.reset}
  node scripts/importarVentas.js ./ventastest.txt
  node scripts/importarVentas.js ./ventas.txt --batch=50 --verbose
      `);
            process.exit(1);
        }

        // Resolver ruta absoluta
        const rutaAbsoluta = path.resolve(rutaArchivo);

        console.log(`
${colores.bright}╔════════════════════════════════════════════════════════╗${colores.reset}
${colores.bright}║    IMPORTADOR MASIVO DE VENTAS - DULCES Y DULCES      ║${colores.reset}
${colores.bright}╚════════════════════════════════════════════════════════╝${colores.reset}
    `);

        info(`Archivo: ${rutaAbsoluta}`);
        info(`Tamaño de batch: ${batchSize}`);
        advertencia('Este proceso puede tomar varios minutos para archivos grandes');

        // Conectar a BD
        console.log('\n');
        info('Conectando a la base de datos...');

        await models.sequelize.authenticate();
        exito('Conexión a BD establecida');

        // Crear importador
        const importador = new ImportadorVentas(models.sequelize, models);
        importador.batchSize = batchSize;

        // Iniciar importación
        console.log('\n');
        const estadisticas = await importador.importar(rutaAbsoluta);

        // Resumen final
        console.log(`
${colores.bright}═══════════════════════════════════════════════════════${colores.reset}
${colores.green}✅ IMPORTACIÓN COMPLETADA CON ÉXITO${colores.reset}
${colores.bright}═══════════════════════════════════════════════════════${colores.reset}

${colores.bright}Resultados:${colores.reset}
  📊 Registros exitosos: ${colores.green}${estadisticas.exitosas}${colores.reset}
  ⚠️  Registros con error: ${colores.yellow}${estadisticas.errores}${colores.reset}
  ⏱️  Tiempo total: ${(estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000}s
  ⚡ Velocidad: ${(
                estadisticas.exitosas /
                ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000)
            ).toFixed(2)} reg/seg

${colores.bright}═══════════════════════════════════════════════════════${colores.reset}
    `);

        process.exit(0);

    } catch (error) {
        console.log('\n');
        error(error.message);
        if (process.argv.includes('--verbose')) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Ejecutar
main();
