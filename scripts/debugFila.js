const models = require('../models');
const ProcesadorVentas = require('../services/importventas');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

async function debugTest() {
    try {
        console.log('🔍 DEBUG: Cargando modelos...');
        await models.sequelize.authenticate();
        console.log('✅ BD conectada\n');

        const procesador = new ProcesadorVentas(models.sequelize, models);
        procesador.verbose = true;

        // Leer primera fila
        const rutaArchivo = path.join(__dirname, '../ventastest.txt');
        const rl = readline.createInterface({
            input: fs.createReadStream(rutaArchivo),
            crlfDelay: Infinity
        });

        let encabezados = null;
        let contador = 0;
        const filas = [];

        for await (const linea of rl) {
            if (contador === 0) {
                encabezados = linea.split('\t');
            } else if (contador === 1) {
                const valores = linea.split('\t');
                const fila = {};
                encabezados.forEach((col, i) => {
                    fila[col] = valores[i];
                });
                filas.push(fila);
                break;
            }
            contador++;
        }

        if (filas.length === 0) {
            console.log('❌ No se encontraron filas');
            process.exit(1);
        }

        console.log('📋 PRIMERA FILA EXTRAÍDA:');
        const fila = filas[0];
        console.log('\nCampos principales:');
        console.log(`• LINEA: "${fila['LINEA']}"`);
        console.log(`• Nro documento: "${fila['Nro documento']}"`);
        console.log(`• REPORTE PROV CON OBS: "${fila['REPORTE PROV CON OBS']}"`);
        console.log(`• Valor subtotal: "${fila['Valor subtotal']}"`);

        console.log('\n🚀 Intentando procesar fila...');

        try {
            // Agregar logs
            console.log('\n📝 Separando TIPO_DOCUMENTO...');
            const tipoDocData = procesador.separarTipoDocumento(fila['Nro documento']?.trim());
            console.log('  Resultado:', tipoDocData);

            console.log('\n📝 Separando PROVEEDOR...');
            const provData = procesador.separarCodigoNombre(fila['LINEA']?.trim());
            console.log('  Resultado:', provData);

            console.log('\n📝 Intentando crear TIPO_DOCUMENTO...');
            try {
                const tipoDoc = await models.tipo_documento_model.create({
                    nombre: tipoDocData.nombre,
                    consecutivo: tipoDocData.consecutivo
                });
                console.log('✅ Creado:', tipoDoc.dataValues);
            } catch (e) {
                console.log('❌ Error creando tipo_documento:', e.message);
            }

            console.log('\n📝 Intentando con obtenerOCrearConCache...');
            const tipoDocResult = await procesador.obtenerOCrearConCache(
                models.tipo_documento_model,
                'TDOC',
                { nombre: tipoDocData.nombre },
                { nombre: tipoDocData.nombre, consecutivo: tipoDocData.consecutivo }
            );
            console.log('📦 Resultado:', tipoDocResult);
            console.log('  Tiene id_tipo_documento?', tipoDocResult.id_tipo_documento);
            console.log('  Tiene dataValues?', tipoDocResult.dataValues);

            const resultado = await procesador.procesarFila(fila);
            console.log('✅ ÉXITO:', resultado);

            // Verificar datos guardados
            const ventas = await models.venta_model.findAll({ limit: 1, order: [['id_venta', 'DESC']] });
            if (ventas.length > 0) {
                console.log('\n✅ VENTA GUARDADA:');
                console.log(ventas[0].dataValues);
            }
        } catch (error) {
            console.log('❌ ERROR PROCESANDO FILA:');
            console.log('Mensaje:', error.message);
            console.log('\nStack:');
            console.log(error.stack);
        }

        await models.sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugTest();
