const cuotaCategoriaImportService = require('../services/cuotaCategoriaImportService');
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
                            archivo: 'Archivo CSV (requerido)',
                            fechaInicio: 'Fecha inicio opcional (default: 2026-03-01)',
                            fechaFin: 'Fecha fin opcional (default: 2026-03-31)'
                        },
                        ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/cargar -F "archivo=@cuotas nestle - Hoja1.csv" -F "fechaInicio=2026-03-01" -F "fechaFin=2026-03-31"'
                    }
                });
            }

            const { fechaInicio, fechaFin } = req.body;
            const rutaArchivo = req.file.path;

            try {
                const resultado = await cuotaCategoriaImportService.importarCuotasNestle(
                    rutaArchivo,
                    fechaInicio || '2026-03-01',
                    fechaFin || '2026-03-31'
                );

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
            const { rutaArchivo, fechaInicio, fechaFin } = req.body;

            if (!rutaArchivo) {
                return res.status(400).send({
                    message: 'rutaArchivo es requerido',
                    ejemplo: {
                        rutaArchivo: './cuotas nestle - Hoja1.csv',
                        fechaInicio: '2026-03-01',
                        fechaFin: '2026-03-31'
                    }
                });
            }

            const resultado = await cuotaCategoriaImportService.importarCuotasNestle(
                rutaArchivo,
                fechaInicio || '2026-03-01',
                fechaFin || '2026-03-31'
            );

            return res.status(200).send(resultado);

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

    async getInstrucciones(req, res) {
        return res.status(200).send({
            titulo: 'Importador de Cuotas por Categoría - Nestlé',
            descripcion: 'Carga cuotas de categoría desde un archivo CSV y actualiza la tabla categoria automáticamente',
            formato_csv: {
                estructura: {
                    columna_1: 'Codigo Vendedor (ignorada, solo para referencia)',
                    columna_2: 'Nombre de vendedor (ignorada, solo para referencia)',
                    columnas_3_en_adelante: 'XXXX - DESCRIPCION (nombre de la categoría a buscar en BD)'
                },
                ejemplo: {
                    cabecera: 'Codigo Vendedor, Nombre de vendedor, 0300 - 1000-CAFES, 1201 - 1000-GALLETAS, 2950 - 2500-CHOCOLATES',
                    fila_1: '0150, De La Cruz Meza Leonar Julian, 30846156, 6407100, 50000',
                    fila_2: '0173, Yama Marcillo Liliana, 10500026, 6886753, 204848',
                    nota: 'Los espacios en blanco al final de los nombres de categorías se ignoran automáticamente'
                },
                importante: [
                    'El CSV puede estar separado por comas (,) o tabulaciones (\\t)',
                    'Los nombres de las categorías deben coincidir (parcialmente) con los de la BD',
                    'Se suman todas las cuotas de los vendedores por cada categoría',
                    'Solo las 2 primeras columnas son ignoradas, el resto son categorías'
                ]
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
                    descripcion: '⭐ RECOMENDADO - Cargar archivo directamente desde Postman',
                    parametros: {
                        archivo: 'Archivo CSV (requerido) - Aceptados: .csv',
                        fechaInicio: 'Fecha de inicio (opcional, default: 2026-03-01) Formato: YYYY-MM-DD',
                        fechaFin: 'Fecha de fin (opcional, default: 2026-03-31) Formato: YYYY-MM-DD'
                    },
                    ejemplo_curl: 'curl -X POST http://localhost:3000/cuota-categoria-import/cargar -F "archivo=@cuotas nestle - Hoja1.csv" -F "fechaInicio=2026-03-01" -F "fechaFin=2026-03-31"',
                    pasos_postman: [
                        '1. Crear nueva request POST a http://localhost:3000/cuota-categoria-import/cargar',
                        '2. Ir a pestaña Body',
                        '3. Seleccionar opción "form-data"',
                        '4. Agregar campo "archivo" de tipo File y seleccionar el CSV',
                        '5. Agregar campos "fechaInicio" y "fechaFin" (text)',
                        '6. Click en Send'
                    ]
                },
                actuales: {
                    metodo: 'GET',
                    url: '/cuota-categoria-import/actuales',
                    descripcion: 'Ver todas las cuotas de categoría cargadas en la BD',
                    ejemplo_curl: 'curl http://localhost:3000/cuota-categoria-import/actuales'
                },
                importar_ruta: {
                    metodo: 'POST',
                    url: '/cuota-categoria-import/importar/nestle',
                    tipo: 'application/json',
                    descripcion: 'Opcional - Si ya tienes el archivo en el servidor',
                    parametros: {
                        rutaArchivo: 'Ruta al archivo CSV en el servidor (requerido)',
                        fechaInicio: 'Fecha de inicio (opcional)',
                        fechaFin: 'Fecha de fin (opcional)'
                    },
                    ejemplo_json: {
                        rutaArchivo: './cuotas nestle - Hoja1.csv',
                        fechaInicio: '2026-03-01',
                        fechaFin: '2026-03-31'
                    }
                }
            },
            respuesta_exitosa: {
                exitosa: true,
                procesadas: 14,
                actualizadas: 14,
                errores: [],
                mensaje: 'Se cargaron 14 cuotas de categoría exitosamente'
            },
            respuesta_con_errores: {
                exitosa: true,
                procesadas: 14,
                actualizadas: 12,
                errores: [
                    { categoria: 'NOMBRE - INCORRECTO', error: 'No encontrada en BD' }
                ],
                mensaje: 'Se cargaron 12 cuotas de categoría exitosamente'
            }
        });
    }
};
