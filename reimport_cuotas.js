/**
 * Reimportar cuotas de proveedores enero 2026 con la lógica corregida
 */

const fs = require('fs');
const path = require('path');
const { importFromBuffer } = require('./services/importCuotaProveedorService');

async function reimportarCuotas() {
    try {
        console.log('📥 Iniciando reimporte de cuotas de proveedores...\n');

        // Ruta del archivo CSV
        const csvPath = path.join(__dirname, 'cuotas_lineas_enero2026_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`❌ Archivo no encontrado: ${csvPath}`);
        }

        console.log(`📄 Archivo: ${path.basename(csvPath)}`);
        
        // Leer el archivo
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        console.log(`📊 Tamaño: ${(fileContent.length / 1024).toFixed(2)} KB`);

        // Importar
        const resumen = await importFromBuffer(fileContent, '2026-01-01', '2026-01-31');

        // Mostrar resultado
        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ REIMPORTE COMPLETADO\n');
        console.log(`📅 Período: ${resumen.fecha_inicio} a ${resumen.fecha_fin}`);
        console.log(`📊 Filas procesadas: ${resumen.filas_procesadas}`);
        console.log(`✅ Cuotas creadas: ${resumen.cuotas_creadas}`);
        console.log(`⏭️  Cuotas omitidas: ${resumen.cuotas_omitidas}`);
        
        if (resumen.errores.length > 0) {
            console.log(`\n❌ Errores (${resumen.errores.length}):`);
            resumen.errores.slice(0, 10).forEach(err => {
                console.log(`   - ${err.motivo || JSON.stringify(err)}`);
            });
            if (resumen.errores.length > 10) {
                console.log(`   ... y ${resumen.errores.length - 10} más`);
            }
        } else {
            console.log(`\n✅ SIN ERRORES`);
        }

        if (resumen.proveedores_no_encontrados && resumen.proveedores_no_encontrados.length > 0) {
            console.log(`\n⚠️  Proveedores no encontrados (${resumen.proveedores_no_encontrados.length}):`);
            resumen.proveedores_no_encontrados.forEach(p => {
                console.log(`   - ${p}`);
            });
        }

        console.log(`${'='.repeat(60)}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en reimporte:', error.message);
        console.error(error);
        process.exit(1);
    }
}

reimportarCuotas();
