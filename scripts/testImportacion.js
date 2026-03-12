#!/usr/bin/env node

/**
 * Test simple de importación con debugging
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  try {
    console.log('🔍 Test de Importación - Debug\n');

    // Paso 1: Conectar a models
    console.log('1️⃣  Cargando modelos...');
    const models = require('../models');
    console.log('   ✅ Modelos cargados');

    // Paso 2: Cargar servicio de importación
    console.log('\n2️⃣  Cargando servicio de importación...');
    const ImportadorVentas = require('../services/importventas');
    console.log('   ✅ Servicio cargado');

    // Paso 3: Crear instancia
    console.log('\n3️⃣  Creando instancia del importador...');
    const importador = new ImportadorVentas(models.sequelize, models);
    console.log('   ✅ Instancia creada');

    // Paso 4: Verificar archivo
    const rutaArchivo = path.resolve('./ventastest.txt');
    console.log(`\n4️⃣  Verificando archivo: ${rutaArchivo}`);
    if (!fs.existsSync(rutaArchivo)) {
      throw new Error(`❌ Archivo no encontrado: ${rutaArchivo}`);
    }
    console.log('   ✅ Archivo encontrado');

    // Paso 5: Leer primeras líneas
    console.log('\n5️⃣  Leyendo primeras líneas...');
    const content = fs.readFileSync(rutaArchivo, 'utf8');
    const lines = content.split('\n');
    console.log(`   Encabezado: ${lines[0].substring(0, 100)}...`);
    console.log(`   Primera fila de datos: ${lines[1].substring(0, 100)}...`);
    console.log(`   ✅ Archivo leído correctamente`);

    // Paso 6: Iniciar importación
    console.log('\n6️⃣  Iniciando importación...');
    const resultados = await importador.importar(rutaArchivo);

    // Paso 7: Mostrar resultados
    console.log('\n7️⃣  Resultados de importación:');
    console.log(`   Total de líneas: ${resultados.totalLineas}`);
    console.log(`   Exitosas: ${resultados.exitosas}`);
    console.log(`   Errores: ${resultados.errores}`);
    console.log(`   Éxito %: ${((resultados.exitosas / resultados.totalLineas) * 100).toFixed(2)}%`);

    if (resultados.erroresDetallados.length > 0) {
      console.log('\n❌ Errores encontrados:');
      resultados.erroresDetallados.slice(0, 5).forEach(err => {
        console.log(`   Fila ${err.numFila}: ${err.error}`);
      });
    } else {
      console.log('\n✅ ¡Importación completada sin errores!');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en el test:');
    console.error(error.message);
    console.error('\nStack:');
    console.error(error.stack);
    process.exit(1);
  }
})();
