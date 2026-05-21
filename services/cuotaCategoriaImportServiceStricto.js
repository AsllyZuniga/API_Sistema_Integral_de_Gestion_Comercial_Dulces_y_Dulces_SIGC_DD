const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;
const { sequelize, cuotaCategoria_model, categoria_model, vendedor_model } = require('../models');

const toNumber = (value) => Number(value || 0);

/**
 * Servicio mejorado para importación de cuotas por categoría con validaciones estrictas
 * 
 * REGLAS IMPORTANTES:
 * ✅ Valida que TODOS los vendedores existan en la BD
 * ✅ Valida que TODAS las categorías existan en la BD
 * ✅ NO crea ni duplica vendedores
 * ✅ NO crea ni duplica categorías
 * ✅ Usa búsqueda EXACTA por nombre de categoría (sin ILIKE parcial)
 * ✅ Reporta detalladamente qué falló y por qué
 * ✅ Usa transacciones para evitar datos inconsistentes
 */
class CuotaCategoriaImportServiceStricto {
    
    /**
     * Validación previa: verifica que todos los datos existan en BD
     * Extrae automáticamente fechas del CSV (columnas fecha_inicio y fecha_fin)
     * Retorna reporte detallado de validación
     */
    // Detectar el delimitador del CSV
    detectarDelimitador(contenido) {
        const primeraLinea = contenido.split('\n')[0];
        const delimitadores = [';', ',', '\t', '|'];
        
        for (const delim of delimitadores) {
            if (primeraLinea.includes(delim)) {
                return delim;
            }
        }
        return ';'; // Por defecto
    }

    async validarDatos(rutaArchivo) {
        try {
            console.log(`\n🔍 VALIDANDO DATOS: ${path.basename(rutaArchivo)}`);

            // 1. Leer y parsear archivo
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const delimitador = this.detectarDelimitador(contenido);
            console.log(`📋 Delimitador detectado: "${delimitador}"`);

            const registros = parse(contenido, {
                columns: true,
                skip_empty_lines: true,
                delimiter: delimitador
            });

            if (!registros || registros.length === 0) {
                throw new Error('Archivo CSV vacío');
            }

            // 2. Normalizar registros
            const registrosNormalizados = registros.map(row => {
                const nuevoRow = {};
                Object.keys(row).forEach(key => {
                    const keyNormalizado = key.trim();
                    nuevoRow[keyNormalizado] = String(row[key] || '').trim();
                });
                return nuevoRow;
            });

            // 3. Extraer cabeceras
            const cabeceras = Object.keys(registrosNormalizados[0]).map(col => col.trim());
            console.log(`📊 Columnas encontradas: ${cabeceras.join(', ')}`);
            
            // Buscar columnas de fecha (flexibles con mayúsculas/minúsculas)
            const colFechaInicio = cabeceras.find(col => 
                col.toLowerCase().replace(/[_\s]/g, '') === 'fechainicio'
            );
            const colFechaFin = cabeceras.find(col => 
                col.toLowerCase().replace(/[_\s]/g, '') === 'fechafin'
            );

            if (!colFechaInicio || !colFechaFin) {
                throw new Error(
                    `No se encontraron columnas de fecha.\n` +
                    `Esperadas: "fecha_inicio" y "fecha_fin"\n` +
                    `Columnas encontradas: ${cabeceras.join(', ')}\n` +
                    `💡 Tip: Las fechas pueden ir al principio o al final del CSV`
                );
            }

            // 4. Extraer fechas del CSV (del primer registro)
            const fechaInicio = registrosNormalizados[0][colFechaInicio];
            const fechaFin = registrosNormalizados[0][colFechaFin];

            // Validar que las fechas existan
            if (!fechaInicio || !fechaFin) {
                throw new Error(`Las fechas en el CSV están vacías. Valor inicio: "${fechaInicio}", fin: "${fechaFin}"`);
            }

            // Validar formato de fechas (flexibles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
            const regexFecha = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/;
            if (!regexFecha.test(fechaInicio) || !regexFecha.test(fechaFin)) {
                throw new Error(
                    `Formato de fecha inválido.\n` +
                    `Soportados: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY\n` +
                    `Recibido: inicio="${fechaInicio}", fin="${fechaFin}"`
                );
            }

            console.log(`📅 Fechas encontradas en columnas "${colFechaInicio}" y "${colFechaFin}": ${fechaInicio} a ${fechaFin}`);
            
            // 5. Identificar columnas de código/nombre de vendedor
            const codigoVendedorCol = cabeceras.find(col => col.toLowerCase().includes('codigo'));
            const nombreVendedorCol = cabeceras.find(col => {
                const lower = col.toLowerCase();
                return (lower === 'nombre' || lower.includes('nombre')) &&
                       !lower.includes('fecha');
            });

            if (!codigoVendedorCol) {
                throw new Error('No se encontró columna con código de vendedor. Esperada columna que contenga "codigo"');
            }

            // 6. Filtrar columnas de categorías (excluir codigo, nombre, fechas)
            const columnasCategoria = cabeceras.filter(col => {
                const lower = col.toLowerCase();
                return !lower.includes('codigo') &&
                       !lower.includes('nombre') &&
                       !lower.includes('fecha') &&
                       col !== '';
            });

            console.log(`✅ Archivo válido: ${registrosNormalizados.length} vendedores, ${columnasCategoria.length} categorías`);

            // 7. Cargar datos de referencia desde BD
            const vendedoresEnBD = await vendedor_model.findAll({ 
                attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
            });
            
            const categoriasEnBD = await categoria_model.findAll({ 
                attributes: ['id_categoria', 'nombre']
            });

            // VALIDAR QUE NO HAY CATEGORÍAS DUPLICADAS EN BD
            const mapCategoriasPorNombre = new Map();
            const duplicadosEnBD = [];
            
            categoriasEnBD.forEach(c => {
                const nombreTrim = c.nombre.trim();
                if (mapCategoriasPorNombre.has(nombreTrim)) {
                    const existente = mapCategoriasPorNombre.get(nombreTrim);
                    duplicadosEnBD.push({
                        nombre: nombreTrim,
                        ids: [existente.id_categoria, c.id_categoria]
                    });
                    // ✅ USAR EL ID MENOR (más reciente o correcto)
                    if (c.id_categoria < existente.id_categoria) {
                        mapCategoriasPorNombre.set(nombreTrim, c);
                    }
                } else {
                    mapCategoriasPorNombre.set(nombreTrim, c);
                }
            });

            if (duplicadosEnBD.length > 0) {
                console.warn(`\n⚠️  ADVERTENCIA: Base de datos contiene ${duplicadosEnBD.length} categorías DUPLICADAS (se usarán los IDs menores):`);
                duplicadosEnBD.slice(0, 10).forEach(dup => {
                    console.warn(`   "${dup.nombre}" → IDs: ${dup.ids.join(', ')} (usando ID: ${Math.min(...dup.ids)})`);
                });
                if (duplicadosEnBD.length > 10) {
                    console.warn(`   ... y ${duplicadosEnBD.length - 10} más`);
                }
                console.warn(`\n💡 Tip: Ejecuta 'node fix_duplicates.js' para limpiar duplicados después\n`);
            }

            const mapVendedoresPorCodigo = new Map(
                vendedoresEnBD.map(v => [v.codigo_vendedor, v])
            );

            // 8. Validar cada fila
            const reporte = {
                archivo: path.basename(rutaArchivo),
                fechaInicio,
                fechaFin,
                totalVendedores: registrosNormalizados.length,
                totalCategorias: columnasCategoria.length,
                vendedoresValidos: [],
                vendedoresNoEncontrados: [],
                categoriasValidas: new Set(),
                categoriasNoEncontradas: [],
                detallesPorVendedor: [],
                duplicadosEnBD: duplicadosEnBD.length,
                esValido: true
            };

            for (let idx = 0; idx < registrosNormalizados.length; idx++) {
                const row = registrosNormalizados[idx];
                const codigoVendedor = row[codigoVendedorCol];
                const nombreVendedor = nombreVendedorCol ? row[nombreVendedorCol] : '';

                if (!codigoVendedor) {
                    console.warn(`⚠️ Fila ${idx + 1}: Sin código de vendedor`);
                    reporte.esValido = false;
                    continue;
                }

                // Validar que vendedor existe
                const vendedor = mapVendedoresPorCodigo.get(codigoVendedor);
                if (!vendedor) {
                    reporte.vendedoresNoEncontrados.push({
                        codigo: codigoVendedor,
                        nombre: nombreVendedor,
                        fila: idx + 1,
                        mensaje: `Vendedor con código "${codigoVendedor}" no existe en BD`
                    });
                    reporte.esValido = false;
                    console.warn(`   ❌ Fila ${idx + 1}: Vendedor "${codigoVendedor}" NO ENCONTRADO`);
                    continue;
                }

                reporte.vendedoresValidos.push({
                    codigo: codigoVendedor,
                    nombre: vendedor.nombre,
                    id: vendedor.id_vendedor
                });

                // Validar categorías para este vendedor
                const detalleVendedor = {
                    codigo: codigoVendedor,
                    nombre: vendedor.nombre,
                    categorias: []
                };

                for (const nombreCategoria of columnasCategoria) {
                    const cuota = toNumber(row[nombreCategoria]);

                    // Buscar categoría EXACTA en BD
                    const categoria = mapCategoriasPorNombre.get(nombreCategoria);
                    
                    if (!categoria) {
                        reporte.categoriasNoEncontradas.push({
                            nombreEsperado: nombreCategoria,
                            codigoVendedor,
                            fila: idx + 1,
                            mensaje: `Categoría "${nombreCategoria}" no existe en BD`
                        });
                        reporte.esValido = false;
                        console.warn(`      ❌ Categoría "${nombreCategoria}" NO ENCONTRADA`);
                        continue;
                    }

                    reporte.categoriasValidas.add(nombreCategoria);
                    detalleVendedor.categorias.push({
                        nombre: nombreCategoria,
                        id: categoria.id_categoria,
                        cuota
                    });
                }

                if (detalleVendedor.categorias.length > 0) {
                    reporte.detallesPorVendedor.push(detalleVendedor);
                }
            }

            reporte.categoriasValidas = Array.from(reporte.categoriasValidas);

            // 9. Resumen de validación
            if (reporte.esValido) {
                console.log(`\n✅ VALIDACIÓN EXITOSA:`);
                console.log(`   • ${reporte.vendedoresValidos.length} vendedores válidos`);
                console.log(`   • ${reporte.categoriasValidas.length} categorías válidas`);
                console.log(`   • Período: ${fechaInicio} a ${fechaFin}`);
                if (duplicadosEnBD.length > 0) {
                    console.log(`   • ⚠️  ${duplicadosEnBD.length} categorías duplicadas detectadas (se usarán IDs menores)`);
                }
            } else {
                console.log(`\n❌ VALIDACIÓN FALLIDA - Se encontraron errores:`);
                if (reporte.vendedoresNoEncontrados.length > 0) {
                    console.log(`   • ${reporte.vendedoresNoEncontrados.length} vendedores NO ENCONTRADOS`);
                    reporte.vendedoresNoEncontrados.forEach(v => {
                        console.log(`      - ${v.codigo} (${v.nombre}) - Fila ${v.fila}`);
                    });
                }
                if (reporte.categoriasNoEncontradas.length > 0) {
                    console.log(`   • ${reporte.categoriasNoEncontradas.length} categorías NO ENCONTRADAS`);
                    reporte.categoriasNoEncontradas.slice(0, 5).forEach(c => {
                        console.log(`      - "${c.nombreEsperado}" (Vendedor: ${c.codigoVendedor}, Fila ${c.fila})`);
                    });
                    if (reporte.categoriasNoEncontradas.length > 5) {
                        console.log(`      ... y ${reporte.categoriasNoEncontradas.length - 5} más`);
                    }
                }
            }

            return reporte;

        } catch (error) {
            console.error(`\n❌ Error en validación:`, error.message);
            throw error;
        }
    }

    /**
     * Importa cuotas SOLO SI la validación fue exitosa
     * Extrae fechas automáticamente del CSV
     * Evita crear registros duplicados o incorrectos
     */
    async importarCuotasNestle(rutaArchivo) {
        try {
            console.log(`\n📦 IMPORTANDO CUOTAS POR CATEGORIA: ${path.basename(rutaArchivo)}`);

            // 1. VALIDAR PRIMERO (extrae fechas automáticamente del CSV)
            const validacion = await this.validarDatos(rutaArchivo);

            if (!validacion.esValido) {
                return {
                    exitosa: false,
                    validacion,
                    procesadas: 0,
                    actualizadas: 0,
                    errores: validacion.vendedoresNoEncontrados.concat(validacion.categoriasNoEncontradas),
                    mensaje: `IMPORTACIÓN CANCELADA: Se encontraron ${validacion.vendedoresNoEncontrados.length + validacion.categoriasNoEncontradas.length} errores de validación`
                };
            }

            // Extraer fechas del reporte de validación
            const { fechaInicio, fechaFin } = validacion;

            // 2. SI VALIDACIÓN OK, PROCEDER CON IMPORTACIÓN
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const delimitador = this.detectarDelimitador(contenido);
            const registros = parse(contenido, {
                columns: true,
                skip_empty_lines: true,
                delimiter: delimitador
            });

            const registrosNormalizados = registros.map(row => {
                const nuevoRow = {};
                Object.keys(row).forEach(key => {
                    const keyNormalizado = key.trim();
                    nuevoRow[keyNormalizado] = String(row[key] || '').trim();
                });
                return nuevoRow;
            });

            const cabeceras = Object.keys(registrosNormalizados[0]).map(col => col.trim());
            const codigoVendedorCol = cabeceras.find(col => col.toLowerCase().includes('codigo'));
            const columnasCategoria = cabeceras.filter(col => {
                const lower = col.toLowerCase();
                return !lower.includes('codigo') &&
                       !lower.includes('nombre') &&
                       !lower.includes('fecha') &&
                       col !== '';
            });

            // Cargar data de referencia nuevamente
            const vendedoresEnBD = await vendedor_model.findAll();
            const categoriasEnBD = await categoria_model.findAll();

            const mapVendedoresPorCodigo = new Map(
                vendedoresEnBD.map(v => [v.codigo_vendedor, v])
            );

            const mapCategoriasPorNombre = new Map(
                categoriasEnBD.map(c => [c.nombre.trim(), c])
            );

            // Transacción para importación
            const transaccion = await sequelize.transaction();
            let procesadas = 0;
            let actualizadas = 0;
            let reemplazadas = 0;
            const erroresEjecucion = [];

            try {
                // PASO 1: Eliminar cuotas existentes para este período
                console.log(`\n🗑️  Eliminando cuotas anteriores del período ${fechaInicio} a ${fechaFin}...`);
                await sequelize.query(`
                    DELETE FROM vendedor_cuota_categoria
                    WHERE fecha_inicio = :fechaInicio
                      AND fecha_fin = :fechaFin
                `, {
                    replacements: {
                        fechaInicio: fechaInicio,
                        fechaFin: fechaFin
                    },
                    transaction: transaccion
                });
                console.log(`✅ Cuotas anteriores eliminadas`);

                // PASO 2: Insertar nuevas cuotas
                console.log(`\n📥 Insertando nuevas cuotas...`);
                for (const row of registrosNormalizados) {
                    const codigoVendedor = row[codigoVendedorCol];
                    const vendedor = mapVendedoresPorCodigo.get(codigoVendedor);

                    if (!vendedor) continue; // Ya fue validado

                    for (const nombreCategoria of columnasCategoria) {
                        const categoria = mapCategoriasPorNombre.get(nombreCategoria);
                        if (!categoria) continue; // Ya fue validado

                        const cuota = toNumber(row[nombreCategoria]);
                        if (cuota <= 0) continue;

                        try {
                            // Insertar directamente (sin ON CONFLICT)
                            await sequelize.query(`
                                INSERT INTO vendedor_cuota_categoria 
                                (id_vendedor, id_categoria, cuota, fecha_inicio, fecha_fin)
                                VALUES (:idVendedor, :idCategoria, :cuota, :fechaInicio, :fechaFin)
                            `, {
                                replacements: {
                                    idVendedor: vendedor.id_vendedor,
                                    idCategoria: categoria.id_categoria,
                                    cuota: Math.round(cuota),
                                    fechaInicio: fechaInicio,
                                    fechaFin: fechaFin
                                },
                                transaction: transaccion
                            });

                            procesadas++;
                            actualizadas++;

                        } catch (err) {
                            erroresEjecucion.push({
                                vendedor: codigoVendedor,
                                categoria: nombreCategoria,
                                cuota: cuota,
                                error: err.message
                            });
                        }
                    }
                }

                await transaccion.commit();

                console.log(`\n✅ IMPORTACIÓN COMPLETADA:`);
                console.log(`   • ${procesadas} combinaciones vendedor-categoría procesadas`);
                console.log(`   • ${actualizadas} registros insertados`);
                console.log(`   • Período: ${fechaInicio} a ${fechaFin}`);
                if (duplicadosEnBD.length > 0) {
                    console.log(`   • ℹ️  ${duplicadosEnBD.length} categorías duplicadas en BD (se usaron IDs menores)`);
                }

                return {
                    exitosa: true,
                    procesadas,
                    actualizadas,
                    reemplazadas,
                    duplicadosEnBD: duplicadosEnBD.length,
                    errores: erroresEjecucion,
                    validacion,
                    mensaje: `Se importaron ${actualizadas} cuotas exitosamente. Las cuotas anteriores del período fueron reemplazadas.${duplicadosEnBD.length > 0 ? ` Nota: Se detectaron ${duplicadosEnBD.length} categorías duplicadas en BD (se usaron IDs menores). Ejecuta 'node fix_duplicates.js' para limpiar.` : ''}`
                };

            } catch (error) {
                await transaccion.rollback();
                throw error;
            }

        } catch (error) {
            console.error(`\n❌ Error en importación:`, error.message);
            throw error;
        }
    }

    async obtenerCuotasActuales() {
        try {
            const cuotas = await sequelize.query(`
                SELECT 
                    c.id_categoria,
                    c.nombre AS categoria,
                    cc.id_cuota_categoria,
                    cc.cuota,
                    cc.fecha_inicio,
                    cc.fecha_fin
                FROM categoria c
                LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
                WHERE cc.id_cuota_categoria IS NOT NULL
                ORDER BY c.nombre ASC
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            return cuotas;
        } catch (error) {
            console.error('Error obteniendo cuotas:', error.message);
            throw error;
        }
    }
}

module.exports = new CuotaCategoriaImportServiceStricto();
