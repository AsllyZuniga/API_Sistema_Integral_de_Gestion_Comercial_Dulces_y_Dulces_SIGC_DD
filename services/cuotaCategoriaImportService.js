const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;
const { sequelize, cuotaCategoria_model, categoria_model } = require('../models');

const toNumber = (value) => Number(value || 0);

class CuotaCategoriaImportService {
    async importarCuotasNestle(rutaArchivo, fechaInicio, fechaFin) {
        try {
            console.log(`\n📦 IMPORTANDO CUOTAS POR CATEGORIA: ${path.basename(rutaArchivo)}`);

            // 1. Leer archivo
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { 
                columns: true, 
                skip_empty_lines: true,
                delimiter: ','
            });

            if (!registros || registros.length === 0) {
                throw new Error('Archivo CSV vacío');
            }

            // 2. Extraer cabeceras y normalizarlas (quitar espacios)
            const primerRegistro = registros[0];
            let cabeceras = Object.keys(primerRegistro).map(col => col.trim());
            
            // Normalizar todos los registros: quitar espacios de las claves
            const registrosNormalizados = registros.map(row => {
                const nuevoRow = {};
                Object.keys(row).forEach(key => {
                    const keyNormalizado = key.trim();
                    nuevoRow[keyNormalizado] = String(row[key] || '').trim();
                });
                return nuevoRow;
            });

            // Actualizar cabeceras después de normalizar
            cabeceras = Object.keys(registrosNormalizados[0]).map(col => col.trim());
            
            // Filtrar solo columnas de categorías (excluir Codigo y Nombre)
            const columnasCategoria = cabeceras.filter(col => 
                !col.toLowerCase().includes('codigo') && 
                !col.toLowerCase().includes('nombre') && 
                col !== ''
            );

            console.log(`✅ Detectadas ${columnasCategoria.length} categorías`);

            // 3. Agrupar cuotas por categoría (suma de todos los vendedores)
            const cuotasPorCategoria = {};
            columnasCategoria.forEach(col => {
                const cuotaTotal = registrosNormalizados.reduce((sum, row) => {
                    return sum + toNumber(row[col]);
                }, 0);
                // Normalizar el nombre de la categoría: trim y normalizar espacios múltiples
                const nombreNormalizado = col.trim().replace(/\s+/g, ' ');
                cuotasPorCategoria[nombreNormalizado] = cuotaTotal;
            });

            console.log(`📊 Cuotas por categoría:`);
            Object.entries(cuotasPorCategoria).forEach(([cat, cuota]) => {
                console.log(`   ${cat}: $${Math.round(cuota).toLocaleString()}`);
            });

            // 4. Procesar cada categoría
            const transaccion = await sequelize.transaction();
            let procesadas = 0;
            let actualizadas = 0;
            const errores = [];

            try {
                for (const [nombreCategoria, cuota] of Object.entries(cuotasPorCategoria)) {
                    if (!nombreCategoria || cuota <= 0) continue;

                    try {
                        // Buscar categoría por nombre (normalizado y sin espacios extras)
                        const categoria = await categoria_model.findOne({
                            where: sequelize.where(
                                sequelize.fn('TRIM', sequelize.col('nombre')),
                                'ILIKE',
                                `%${nombreCategoria}%`
                            ),
                            transaction: transaccion
                        });

                        if (!categoria) {
                            console.warn(`⚠️ Categoría no encontrada: "${nombreCategoria}"`);
                            errores.push({ 
                                categoria: nombreCategoria, 
                                error: 'No encontrada en BD',
                                sugerencia: 'Verifica el nombre exacto en la tabla categoria'
                            });
                            continue;
                        }

                        // Crear o actualizar cuota de categoría
                        let cuotaReg = await cuotaCategoria_model.findOne({
                            where: { 
                                fecha_inicio: fechaInicio,
                                fecha_fin: fechaFin
                            },
                            transaction: transaccion
                        });

                        if (!cuotaReg) {
                            // Crear nueva
                            cuotaReg = await cuotaCategoria_model.create({
                                cuota: Math.round(cuota),
                                fecha_inicio: fechaInicio,
                                fecha_fin: fechaFin
                            }, { transaction: transaccion });
                        }

                        // Actualizar categoría con el id_cuota_categoria
                        await categoria.update(
                            { id_cuota_categoria: cuotaReg.id_cuota_categoria },
                            { transaction: transaccion }
                        );

                        procesadas++;
                        actualizadas++;
                        console.log(`   ✅ ${categoria.nombre}: $${Math.round(cuota).toLocaleString()}`);

                    } catch (err) {
                        errores.push({ 
                            categoria: nombreCategoria, 
                            error: err.message 
                        });
                        console.error(`   ❌ Error en ${nombreCategoria}:`, err.message);
                    }
                }

                await transaccion.commit();

                console.log(`\n✅ IMPORTACIÓN COMPLETADA:`);
                console.log(`   • ${procesadas} categorías procesadas`);
                console.log(`   • ${actualizadas} categorías actualizadas`);
                if (errores.length > 0) {
                    console.log(`   • ${errores.length} errores`);
                }

                return {
                    exitosa: true,
                    procesadas,
                    actualizadas,
                    errores,
                    mensaje: `Se cargaron ${actualizadas} cuotas de categoría exitosamente`
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

module.exports = new CuotaCategoriaImportService();
