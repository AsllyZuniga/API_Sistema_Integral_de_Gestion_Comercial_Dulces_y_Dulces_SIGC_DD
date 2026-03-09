#!/usr/bin/env node

/**
 * Validador de archivo TSV antes de importación
 * 
 * Uso:
 *   node scripts/validarTSV.js ./ventastest.txt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colores = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function error(msg) { console.log(`${colores.red}❌ ${msg}${colores.reset}`); }
function exito(msg) { console.log(`${colores.green}✅ ${msg}${colores.reset}`); }
function info(msg) { console.log(`${colores.cyan}ℹ️  ${msg}${colores.reset}`); }
function adv(msg) { console.log(`${colores.yellow}⚠️  ${msg}${colores.reset}`); }

async function validarArchivo(rutaArchivo) {
    try {
        const rutaAbsoluta = path.resolve(rutaArchivo);

        console.log(`
${colores.bright}╔════════════════════════════════════════╗${colores.reset}
${colores.bright}║       VALIDADOR DE ARCHIVO TSV        ║${colores.reset}
${colores.bright}╚════════════════════════════════════════╝${colores.reset}
    `);

        // 1. Validar que existe
        if (!fs.existsSync(rutaAbsoluta)) {
            error(`Archivo no existe: ${rutaAbsoluta}`);
            return false;
        }
        exito(`Archivo encontrado: ${path.basename(rutaAbsoluta)}`);

        // 2. Validar tamaño
        const stats = fs.statSync(rutaAbsoluta);
        const tamanioMB = (stats.size / (1024 * 1024)).toFixed(2);
        info(`Tamaño: ${tamanioMB} MB`);

        if (stats.size > 1000 * 1024 * 1024) {
            adv(`Archivo muy grande (${tamanioMB}MB), puede demorar bastante`);
        }

        // 3. Validar estructura
        const fileStream = fs.createReadStream(rutaAbsoluta, {
            encoding: 'utf8',
            highWaterMark: 64 * 1024
        });

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let numeroLinea = 0;
        let encabezados = [];
        let columnasEsperadas = 0;
        const erroresLinea = [];
        const advertenciasLinea = [];
        const estadisticas = {
            lineasExitosas: 0,
            lineasError: 0,
            camposVacios: 0,
            valoresMoneda: 0,
            valoresFecha: 0
        };

        const encabezadosEsperados = [
            'LINEA', 'CATEGORIA', 'CANAL', 'Codigo vendedor', 'Nombre vendedor',
            'Nro documento', 'Item', 'Desc. item', 'U.M. Orden', 'Fecha',
            'Cliente factura', 'Sucursal factura', 'Razon social cliente factura',
            'Direccion 1', 'Desc. ciudad', 'Cantidad emp.', 'Cantidad',
            'Costo promedio total', 'Valor bruto', 'Valor descuentos',
            'Valor subtotal', 'Valor impuestos', 'Valor neto', 'Margen promedio',
            'Impuesto afecta margen', 'Factor U.M. emp.', 'Factor U.M. Orden',
            'Peso en KILO', 'Barrio', 'DETALLE TIPO DE NEGOCIO', 'Cond. pago fact',
            'Nombre establecimiento  facturar', 'TIPO DE NEGOCIO', 'SUBCANAL',
            'SUBCANAL DETALLADO', 'MEGACATEGORIA', 'SUBCATEGORIA',
            'REPORTE PROV CON OBS'
        ];

        for await (const linea of rl) {
            numeroLinea++;

            if (numeroLinea === 1) {
                encabezados = linea.split('\t');
                columnasEsperadas = encabezados.length;

                info(`Columnas detectadas: ${columnasEsperadas}`);

                // Verificar encabezados
                let encabezadosFaltantes = [];
                for (const esperado of encabezadosEsperados) {
                    if (!encabezados.includes(esperado)) {
                        encabezadosFaltantes.push(esperado);
                    }
                }

                if (encabezadosFaltantes.length > 0) {
                    adv(`Encabezados faltantes (${encabezadosFaltantes.length}):`);
                    encabezadosFaltantes.forEach(e => console.log(`    - ${e}`));
                } else {
                    exito('Todos los encabezados requeridos presentes');
                }
                continue;
            }

            const valores = linea.split('\t');

            // Validar número de columnas
            if (valores.length !== columnasEsperadas) {
                erroresLinea.push(`Línea ${numeroLinea}: ${valores.length} columnas (esperadas ${columnasEsperadas})`);
                estadisticas.lineasError++;
                continue;
            }

            // Validar contenido
            const registro = {};
            encabezados.forEach((h, i) => { registro[h] = valores[i]; });

            // Campos requeridos
            const camposRequeridos = ['Nro documento', 'Cliente factura', 'Item', 'Cantidad', 'Valor subtotal'];
            for (const campo of camposRequeridos) {
                if (!registro[campo] || registro[campo].trim() === '') {
                    advertenciasLinea.push(`Línea ${numeroLinea}: Campo requerido vacío: "${campo}"`);
                    estadisticas.camposVacios++;
                }
            }

            // Validar fechas
            if (registro['Fecha'] && registro['Fecha'].trim() !== '') {
                const partes = registro['Fecha'].split('/');
                if (partes.length !== 3 || isNaN(partes[0]) || isNaN(partes[1]) || isNaN(partes[2])) {
                    advertenciasLinea.push(`Línea ${numeroLinea}: Fecha inválida: "${registro['Fecha']}"`);
                }
                estadisticas.valoresFecha++;
            }

            // Validar valores monetarios
            const camposMoneda = ['Valor subtotal', 'Valor descuentos', 'Valor impuestos', 'Valor neto'];
            for (const campo of camposMoneda) {
                if (registro[campo] && registro[campo].includes('$')) {
                    estadisticas.valoresMoneda++;
                }
            }

            estadisticas.lineasExitosas++;

            // Mostrar progreso cada 1000 líneas
            if (numeroLinea % 1000 === 0) {
                info(`Validadas ${numeroLinea} líneas...`);
            }
        }

        // Resumen
        console.log(`
${colores.bright}═════════════════════════════════════════${colores.reset}
${colores.bright}VALIDACIÓN COMPLETADA${colores.reset}
${colores.bright}═════════════════════════════════════════${colores.reset}

${colores.bright}Estadísticas:${colores.reset}
  📊 Total de líneas: ${numeroLinea - 1}
  ✅ Líneas válidas: ${estadisticas.lineasExitosas}
  ❌ Líneas con error: ${estadisticas.lineasError}
  ⚠️  Campos vacíos: ${estadisticas.camposVacios}
  💰 Valores con moneda: ${estadisticas.valoresMoneda}
  📅 Fechas detectadas: ${estadisticas.valoresFecha}

${colores.bright}Primeros errores detectados:${colores.reset}
    `);

        if (erroresLinea.length === 0) {
            exito('No hay errores críticos');
        } else {
            erroresLinea.slice(0, 5).forEach(e => error(e));
            if (erroresLinea.length > 5) {
                adv(`Y ${erroresLinea.length - 5} errores más...`);
            }
        }

        console.log(`
${colores.bright}Primeras advertencias:${colores.reset}
    `);

        if (advertenciasLinea.length === 0) {
            exito('No hay advertencias');
        } else {
            advertenciasLinea.slice(0, 5).forEach(a => adv(a));
            if (advertenciasLinea.length > 5) {
                adv(`Y ${advertenciasLinea.length - 5} advertencias más...`);
            }
        }

        console.log(`
${colores.bright}═════════════════════════════════════════${colores.reset}
    `);

        if (erroresLinea.length === 0) {
            exito('El archivo está listo para importación');
            return true;
        } else {
            error('El archivo tiene errores, revisar antes de importar');
            return false;
        }

    } catch (err) {
        error(err.message);
        return false;
    }
}

// Ejecutar
const args = process.argv.slice(2);
if (args.length === 0) {
    error('Debes proporcionar una ruta al archivo');
    console.log(`${colores.cyan}Uso: node scripts/validarTSV.js ./ventastest.txt${colores.reset}`);
    process.exit(1);
}

validarArchivo(args[0]).then(esValido => {
    process.exit(esValido ? 0 : 1);
});
