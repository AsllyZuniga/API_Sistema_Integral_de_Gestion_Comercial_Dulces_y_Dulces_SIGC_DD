const ImportadorVentas = require('../services/importventas');
const models = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * POST /import/ventas/upload
 * Importa ventas desde un archivo TSV cargado vía multipart/form-data
 * 
 * Form-data esperado:
 * {
 *   "archivo": <archivo TSV>
 *   "batchSize": 100 (opcional)
 * }
 */
async function importarVentasConArchivo(req, res) {
    let archivoProcesado = null;

    try {
        // Validar que se adjuntó un archivo
        if (!req.file) {
            return res.status(400).json({
                error: 'Archivo requerido',
                mensaje: 'Debes adjuntar un archivo TSV en el campo "archivo"'
            });
        }

        const rutaArchivo = req.file.path;
        const nombreArchivo = req.file.originalname;
        const tamanoMB = (req.file.size / (1024 * 1024)).toFixed(2);
        const batchSize = parseInt(req.body.batchSize) || 100;

        console.log(`\n🚀 Iniciando importación desde upload: ${nombreArchivo}`);
        console.log(`📊 Tamaño: ${tamanoMB} MB`);
        console.log(`⚙️  Batch size: ${batchSize}`);

        archivoProcesado = rutaArchivo;

        // Crear importador
        const importador = new ImportadorVentas(
            models.sequelize,
            models
        );
        importador.batchSize = batchSize;

        // Ejecutar importación
        const estadisticas = await importador.importar(rutaArchivo);

        // Eliminar archivo temporal
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
        }

        return res.status(200).json({
            mensaje: 'Importación completada exitosamente',
            archivo: nombreArchivo,
            tamano_mb: parseFloat(tamanoMB),
            estadisticas: {
                registrosExitosos: estadisticas.exitosas,
                registrosConError: estadisticas.errores,
                tiempoTotalSegundos: ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000).toFixed(2),
                velocidadRegistrosPorSegundo: (
                    estadisticas.exitosas /
                    ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000)
                ).toFixed(2)
            }
        });

    } catch (error) {
        console.error('❌ Error en importación:', error);

        // Limpiar archivo si hay error
        if (archivoProcesado && fs.existsSync(archivoProcesado)) {
            fs.unlinkSync(archivoProcesado);
        }

        return res.status(500).json({
            error: 'Error durante la importación',
            mensaje: error.message,
            detalles: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

/**
 * POST /import/ventas
 * Inicia la importación de ventas desde un archivo TSV con ruta
 * 
 * Body esperado (JSON):
 * {
 *   "rutaArchivo": "/ruta/al/archivo/ventas.txt",
 *   "batchSize": 100 (opcional)
 * }
 */
async function importarVentas(req, res) {
    try {
        const { rutaArchivo, batchSize } = req.body;

        if (!rutaArchivo) {
            return res.status(400).json({
                error: 'rutaArchivo es requerido',
                mensaje: 'Debes proporcionar la ruta completa al archivo TSV'
            });
        }

        // Validar que el archivo existe
        if (!fs.existsSync(rutaArchivo)) {
            return res.status(404).json({
                error: 'Archivo no encontrado',
                mensaje: `El archivo ${rutaArchivo} no existe`
            });
        }

        console.log(`\n🚀 Iniciando importación desde: ${rutaArchivo}`);

        const importador = new ImportadorVentas(
            models.sequelize,
            models
        );

        if (batchSize) {
            importador.batchSize = parseInt(batchSize);
        }

        const estadisticas = await importador.importar(rutaArchivo);

        return res.status(200).json({
            mensaje: 'Importación completada',
            archivo: rutaArchivo,
            estadisticas: {
                registrosExitosos: estadisticas.exitosas,
                registrosConError: estadisticas.errores,
                tiempoTotalSegundos: ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000).toFixed(2),
                velocidadRegistrosPorSegundo: (
                    estadisticas.exitosas /
                    ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000)
                ).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Error en importación:', error);

        return res.status(500).json({
            error: 'Error durante la importación',
            mensaje: error.message,
            detalles: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

/**
 * GET /import/status
 * Verifica disponibilidad del servicio de importación
 */
async function verificarEstado(req, res) {
    try {
        // Verificar conexión a BD
        await models.sequelize.authenticate();

        return res.status(200).json({
            estado: 'operacional',
            bd: 'conectada',
            servicio: 'importador de ventas disponible'
        });

    } catch (error) {
        return res.status(500).json({
            estado: 'error',
            bd: 'no conectada',
            mensaje: error.message
        });
    }
}

module.exports = {
    importarVentas,
    importarVentasConArchivo,
    verificarEstado
};
