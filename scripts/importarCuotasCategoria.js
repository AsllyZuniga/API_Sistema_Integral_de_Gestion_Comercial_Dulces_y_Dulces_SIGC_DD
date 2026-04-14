#!/usr/bin/env node

/**
 * Script para importar cuotas de categoría desde CSV
 * Uso: node scripts/importarCuotasCategoria.js [rutaArchivo] [fechaInicio] [fechaFin]
 * 
 * Ejemplo:
 *   node scripts/importarCuotasCategoria.js "./cuotas nestle - Hoja1.csv" "2026-03-01" "2026-03-31"
 */

const path = require('path');
const cuotaCategoriaImportService = require('../services/cuotaCategoriaImportService');

async function main() {
    try {
        const args = process.argv.slice(2);

        if (args.length < 1) {
            console.log(`
🚀 Importador de Cuotas por Categoría

Uso:
  node scripts/importarCuotasCategoria.js <rutaArchivo> [fechaInicio] [fechaFin]

Ejemplo:
  node scripts/importarCuotasCategoria.js "./cuotas nestle - Hoja1.csv" "2026-03-01" "2026-03-31"

Parámetros:
  rutaArchivo    - Ruta al archivo CSV (requerido)
  fechaInicio    - Fecha de inicio (opcional, default: 2026-03-01)
  fechaFin       - Fecha de fin (opcional, default: 2026-03-31)
            `);
            process.exit(1);
        }

        const rutaArchivo = args[0];
        const fechaInicio = args[1] || '2026-03-01';
        const fechaFin = args[2] || '2026-03-31';

        // Validar que el archivo existe
        const fs = require('fs');
        if (!fs.existsSync(rutaArchivo)) {
            console.error(`❌ Archivo no encontrado: ${rutaArchivo}`);
            process.exit(1);
        }

        console.log(`\n📄 Archivo: ${path.resolve(rutaArchivo)}`);
        console.log(`📅 Período: ${fechaInicio} a ${fechaFin}\n`);

        const resultado = await cuotaCategoriaImportService.importarCuotasNestle(
            rutaArchivo,
            fechaInicio,
            fechaFin
        );

        if (resultado.exitosa) {
            console.log(`\n✨ ${resultado.mensaje}`);
            process.exit(0);
        } else {
            console.error(`\n❌ Importación fallida`);
            process.exit(1);
        }

    } catch (error) {
        console.error(`\n❌ Error:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
