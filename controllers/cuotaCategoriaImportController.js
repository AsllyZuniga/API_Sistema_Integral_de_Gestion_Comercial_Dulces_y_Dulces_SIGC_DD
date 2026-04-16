const cuotaCategoriaImportService = require('../services/cuotaCategoriaImportServiceStricto');
const fs = require('fs');
const path = require('path');

module.exports = {
    async importarConArchivo(req, res) {
        try {
            if (!req.file) {
                return res.status(400).send({
                    message: 'Archivo es requerido',
                    instrucciones: {
                        endpoint: 'POST /cuota-categoria-import/cargar',
                        tipo: 'multipart/form-data',
                        campos: {
                            archivo: 'Archivo CSV (requerido) - Debe contener columnas: nombre, codigo_vendedor, categorías, fecha_inicio, fecha_fin'
                        },
                        importante: 'Las fechas se extraen automáticamente del CSV (columnas fecha_inicio y fecha_fin). NO necesitas enviar mesAnio ni fechas por parámetro.',
                        ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/cargar -F "archivo=@cuotasCategoriasMarzo.csv"'
                    }
                });
            }

            const rutaArchivo = req.file.path;

            try {
                // NO pasar fechas - el servicio las extrae del CSV
                const resultado = await cuotaCategoriaImportService.importarCuotasNestle(rutaArchivo);

                return res.status(200).send(resultado);

            } finally {
                // Eliminar archivo temporal
                if (fs.existsSync(rutaArchivo)) {
                    fs.unlinkSync(rutaArchivo);
                }
            }

        } catch (error) {
            return res.status(400).send({
                message: 'Error en importación de cuotas',
                error: error.message
            });
        }
    },

    async importarCuotasNestle(req, res) {
        try {
            const { rutaArchivo } = req.body;

            if (!rutaArchivo) {
                return res.status(400).send({
                    message: 'rutaArchivo es requerido',
                    instrucciones: {
                        endpoint: 'POST /cuota-categoria-import/importar/nestle',
                        tipo: 'application/json',
                        body: {
                            rutaArchivo: 'Ruta al archivo CSV en el servidor (requerido)',
                            importante: 'El CSV debe tener columnas: fecha_inicio y fecha_fin. Las fechas se extraen automáticamente.'
                        },
                        ejemplo: {
                            rutaArchivo: './cuotasCategoriasMarzo.csv'
                        }
                    }
                });
            }

            try {
                // NO pasar fechas - el servicio las extrae del CSV
                const resultado = await cuotaCategoriaImportService.importarCuotasNestle(rutaArchivo);

                return res.status(200).send(resultado);

            } catch (error) {
                throw error;
            }

        } catch (error) {
            return res.status(400).send({
                message: 'Error en importación de cuotas',
                error: error.message
            });
        }
    },

    async obtenerCuotasActuales(req, res) {
        try {
            const cuotas = await cuotaCategoriaImportService.obtenerCuotasActuales();

            return res.status(200).send({
                total: cuotas.length,
                detalle: cuotas
            });

        } catch (error) {
            return res.status(400).send({
                message: 'Error obteniendo cuotas',
                error: error.message
            });
        }
    },

    async validarArchivo(req, res) {
        try {
            if (!req.file) {
                return res.status(400).send({
                    message: 'Archivo es requerido para validar',
                    instrucciones: {
                        endpoint: 'POST /cuota-categoria-import/validar',
                        tipo: 'multipart/form-data',
                        campos: {
                            archivo: 'Archivo CSV (requerido)'
                        },
                        importante: 'El CSV debe tener columnas: fecha_inicio y fecha_fin. Las fechas se extraen automáticamente del archivo.',
                        ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/validar -F "archivo=@cuotasCategoriasMarzo.csv"'
                    }
                });
            }

            const rutaArchivo = req.file.path;

            try {
                // NO pasar fechas - el servicio las extrae del CSV
                const validacion = await cuotaCategoriaImportService.validarDatos(rutaArchivo);

                return res.status(200).send({
                    success: validacion.esValido,
                    validacion
                });

            } finally {
                // Eliminar archivo temporal
                if (require('fs').existsSync(rutaArchivo)) {
                    require('fs').unlinkSync(rutaArchivo);
                }
            }

        } catch (error) {
            return res.status(400).send({
                message: 'Error en validación de archivo',
                error: error.message
            });
        }
    },

    async getInstrucciones(req, res) {
        return res.status(200).send({
            titulo: 'Importador de Cuotas por Categoría - Nestlé (Modo Automático con Fechas del CSV)',
            descripcion: 'Carga cuotas de categoría desde un archivo CSV con validaciones estrictas. Las fechas se extraen automáticamente del CSV.',
            importante: [
                '🟢 LAS FECHAS SE EXTRAEN AUTOMÁTICAMENTE DEL CSV',
                '🟢 NO necesitas pasar mesAnio o fechaInicio/fechaFin como parámetros',
                '🔴 El CSV DEBE tener columnas: fecha_inicio y fecha_fin',
                '🔴 MODO ESTRICTO: Valida que TODOS los vendedores existan en la BD',
                '🔴 Valida que TODAS las categorías existan en la BD',
                '🔴 Búsqueda EXACTA de categorías por nombre (sin coincidencias parciales)',
                '🔴 Si hay errores de validación, CANCELA la importación completa',
                '🔴 NO crea vendedores nuevos',
                '🔴 NO crea categorías nuevas',
                '🟢 Reporte detallado de validación antes de proceder',
                '🟢 Transacciones para garantizar consistencia'
            ],
            formato_csv: {
                estructura: {
                    columna_1: 'nombre (del vendedor)',
                    columna_2: 'codigo_vendedor (debe coincidir exactamente con BD)',
                    columnas_3_al_n_menos_2: 'Nombres de categorías exactos (deben coincidir exactamente con BD)',
                    columna_penultima: 'fecha_inicio (formato YYYY-MM-DD)',
                    columna_ultima: 'fecha_fin (formato YYYY-MM-DD)'
                },
                ejemplo: {
                    cabecera: 'nombre;codigo_vendedor;0300 - 1000-CAFES;1201 - 1000-GALLETAS;fecha_inicio;fecha_fin',
                    fila_1: 'De La Cruz Meza;0150;38090263;7155926;2026-03-01;2026-03-31',
                    fila_2: 'Yama Marcillo;0173;13917137;8251910;2026-03-01;2026-03-31',
                    nota_importante: '✅ Las fechas se leen automáticamente del CSV. No necesitas parámetros adicionales.'
                },
                importante: [
                    '✅ Delimitador DEBE ser ; (punto y coma)',
                    '✅ Códigos de vendedor deben existir exactamente en tabla vendedor',
                    '✅ Nombres de categorías deben coincidir exactamente en tabla categoria',
                    '✅ Columnas fecha_inicio y fecha_fin con formato YYYY-MM-DD',
                    '✅ Se reportarán detalladamente qué vendedores/categorías no fueron encontrados',
                    '✅ La importación se CANCELA si hay errores de validación'
                ]
            },
            validacion: {
                paso_1: 'Lee el CSV e identifica columnas (nombre, codigo_vendedor, categorías, fecha_inicio, fecha_fin)',
                paso_2: 'Extrae automáticamente las fechas del CSV (primera fila)',
                paso_3: 'Verifica que TODOS los códigos_vendedor existan en BD',
                paso_4: 'Verifica que TODOS los nombres de categoría existan en BD (búsqueda exacta)',
                paso_5: 'Si hay errores, CANCELA y reporta detalladamente qué falló',
                paso_6: 'Si validación OK, procede con importación en transacción',
                resultado: {
                    exitosa: 'Retorna resumen de validación y cambios realizados',
                    fallida: 'Retorna lista detallada de vendedores/categorías no encontrados SIN hacer cambios en BD'
                }
            },
            endpoints: {
                instrucciones: {
                    metodo: 'GET',
                    url: '/cuota-categoria-import/',
                    descripcion: 'Ver esta información'
                },
                cargar: {
                    metodo: 'POST',
                    url: '/cuota-categoria-import/cargar',
                    tipo: 'multipart/form-data',
                    descripcion: '⭐ PRINCIPAL - Cargar archivo directamente',
                    parametros: {
                        archivo: 'Archivo CSV (requerido) - Debe tener columnas: fecha_inicio, fecha_fin'
                    },
                    nota: '✅ Fechas extraídas automáticamente del CSV - NO envíes parámetros de fecha',
                    ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/cargar -F "archivo=@cuotasCategoriasMarzo.csv"',
                    pasos_postman: [
                        '1. POST a http://localhost:3000/cuota-categoria-import/cargar',
                        '2. Body → form-data',
                        '3. "archivo" (File) + selecciona tu CSV',
                        '4. Send'
                    ]
                },
                validar_primero: {
                    metodo: 'POST',
                    url: '/cuota-categoria-import/validar',
                    tipo: 'multipart/form-data',
                    descripcion: '🔍 RECOMENDADO - Validar SIN importar',
                    parametros: {
                        archivo: 'Archivo CSV (requerido)'
                    },
                    nota: '✅ Sin parámetros adicionales - fechas del CSV',
                    utilidad: 'Ver todos los errores de validación ANTES de importar',
                    ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/validar -F "archivo=@cuotasCategoriasMarzo.csv"'
                },
                actuales: {
                    metodo: 'GET',
                    url: '/cuota-categoria-import/actuales',
                    descripcion: 'Ver cuotas de categoría cargadas en BD'
                },
                importar_ruta: {
                    metodo: 'POST',
                    url: '/cuota-categoria-import/importar/nestle',
                    tipo: 'application/json',
                    descripcion: 'Si archivo está en servidor',
                    parametros: {
                        rutaArchivo: 'Ruta al CSV en servidor (requerido)'
                    },
                    nota: '✅ El CSV debe tener columnas fecha_inicio y fecha_fin',
                    ejemplo: {
                        rutaArchivo: './cuotasCategoriasMarzo.csv'
                    }
                }
            },
            ejemplos_respuesta: {
                validacion_exitosa: {
                    success: true,
                    validacion: {
                        esValido: true,
                        fechaInicio: '2026-03-01',
                        fechaFin: '2026-03-31',
                        vendedoresValidos: [
                            { codigo: '0150', nombre: 'De La Cruz Meza', id: 1 },
                            { codigo: '0173', nombre: 'Yama Marcillo', id: 2 }
                        ],
                        categoriasValidas: ['0300 - 1000-CAFES', '1201 - 1000-GALLETAS'],
                        vendedoresNoEncontrados: [],
                        categoriasNoEncontradas: []
                    }
                },
                validacion_fallida: {
                    success: false,
                    validacion: {
                        esValido: false,
                        fechaInicio: '2026-03-01',
                        fechaFin: '2026-03-31',
                        vendedoresNoEncontrados: [
                            {
                                codigo: '9999',
                                nombre: 'Inexistente',
                                fila: 5,
                                mensaje: 'Vendedor con código "9999" no existe en BD'
                            }
                        ],
                        categoriasNoEncontradas: [
                            {
                                nombreEsperado: 'CATEGORIA FAKE',
                                codigoVendedor: '0150',
                                fila: 2,
                                mensaje: 'Categoría "CATEGORIA FAKE" no existe en BD'
                            }
                        ]
                    }
                },
                importacion_exitosa: {
                    exitosa: true,
                    procesadas: 28,
                    actualizadas: 28,
                    errores: [],
                    validacion: {
                        esValido: true,
                        fechaInicio: '2026-03-01',
                        fechaFin: '2026-03-31',
                        totalVendedores: 4,
                        totalCategorias: 14
                    },
                    mensaje: 'Se importaron 28 cuotas exitosamente'
                }
            },
            errores_comunes: {
                falta_fecha_inicio: {
                    problema: 'CSV no tiene columna fecha_inicio',
                    solucion: 'Agrega columna "fecha_inicio" al final del CSV con formato YYYY-MM-DD'
                },
                falta_fecha_fin: {
                    problema: 'CSV no tiene columna fecha_fin',
                    solucion: 'Agrega columna "fecha_fin" al final del CSV con formato YYYY-MM-DD'
                },
                fecha_formato_incorrecto: {
                    problema: 'Fecha en formato incorrecto (ej: 03/01/2026)',
                    solucion: 'Usa formato YYYY-MM-DD (ej: 2026-03-01)'
                },
                vendedor_no_existe: {
                    problema: 'Código de vendedor no existe en BD',
                    solucion: 'Verifica que el codigo_vendedor en CSV coincida EXACTAMENTE con BD'
                },
                categoria_no_existe: {
                    problema: 'Nombre de categoría no coincide exactamente',
                    solucion: 'Copia el nombre EXACTO de la categoría desde BD. Las búsquedas parciales NO están permitidas.'
                }
            }
        });
    }
};
