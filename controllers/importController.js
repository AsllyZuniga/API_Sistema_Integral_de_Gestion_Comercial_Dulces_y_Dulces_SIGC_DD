const ImportadorVentasOptimizado = require('../services/importventas-optimizado');
const importCuotasService = require('../services/importCuotas');
const models = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * POST /import/ventas/upload
 * Importa ventas desde un archivo TSV (Ej. ventas febrero.txt) con Streaming en tiempo real
 */
async function importarVentasConArchivo(req, res) {
    let archivoProcesado = null;
    let heartbeatInterval = null;

    try {
        // Dar tiempo suficiente al servidor (3 horas) para archivos inmensos
        req.setTimeout(3 * 60 * 60 * 1000);
        res.setTimeout(3 * 60 * 60 * 1000);

        // CONFIGURACIÓN DE STREAMING (Mantiene a Postman escuchando en vivo)
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
        });

        if (!req.file) {
            res.write("❌ Error: Archivo requerido. Debes adjuntar un archivo en el campo 'archivo'\n");
            res.end();
            return;
        }

        archivoProcesado = req.file.path;
        const nombreArchivo = req.file.originalname;
        const tamanoMB = (req.file.size / (1024 * 1024)).toFixed(2);

        // Ajuste dinámico del Batch Size (Por defecto 1000 para proteger la RAM)
        const batchSizeInput = parseInt(req.body.batchSize, 10);
        const batchSize = Number.isFinite(batchSizeInput)
            ? Math.max(1000, Math.min(batchSizeInput, 20000))
            : 1000;

        res.write(`🚀 INICIANDO IMPORTACIÓN DE VENTAS: ${nombreArchivo}\n`);
        res.write(`📊 Tamaño del archivo: ${tamanoMB} MB | Lotes de: ${batchSize} registros\n`);
        res.write(`--------------------------------------------------\n`);

        const importador = new ImportadorVentasOptimizado(models.sequelize, models);
        importador.BATCH_SIZE = batchSize;

        // ✅ HEARTBEAT: Mantener viva la conexión cada 5 segundos (previene timeout en hosting)
        heartbeatInterval = setInterval(() => {
            if (!res.headersSent || res.writableEnded === false) {
                res.write('\n'); // Envía un newline para mantener viva la conexión
            }
        }, 5000);

        // Logger callback para enviar logs al cliente en tiempo real
        const loggerCallback = (mensaje) => {
            console.log(mensaje); // Mantener en consola para debugging
            res.write(mensaje + '\n'); // Enviar también al cliente
        };

        // Callback para enviar el progreso a Postman en vivo
        const reportarProgreso = (procesados, insertados, errores) => {
            const memoriaUsada = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            res.write(`⏳ [PROGRESO] Líneas leídas: ${procesados} | Detalles insertados: ${insertados} | Errores: ${errores} | RAM: ${memoriaUsada}MB\n`);
        };

        // Ejecutar el motor de importación con logger
        const estadisticas = await importador.importar(archivoProcesado, reportarProgreso, loggerCallback);

        res.write(`\n✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE\n`);
        res.write(`==================================================\n`);
        res.write(`⏱️ Tiempo total: ${estadisticas.duracion}\n`);
        res.write(`📊 Total Filas Procesadas: ${estadisticas.procesados}\n`);
        res.write(`💾 TOTAL DETALLES GUARDADOS: ${estadisticas.insertados}\n`);
        res.write(`❌ Errores detectados: ${estadisticas.errores}\n`);
        res.write(`⚡ Velocidad: ${(estadisticas.procesados / parseFloat(estadisticas.duracion)).toFixed(2)} reg/seg\n`);
        res.write(`==================================================\n`);

        if (fs.existsSync(archivoProcesado)) {
            fs.unlinkSync(archivoProcesado);
        }
        res.end();

    } catch (error) {
        console.error('Error durante importación de ventas:', error);
        res.write(`\n❌ ERROR CRÍTICO DETENIDO: ${error.message}\n`);
        if (archivoProcesado && fs.existsSync(archivoProcesado)) {
            fs.unlinkSync(archivoProcesado);
        }
        res.end();
    } finally {
        // Limpiar el heartbeat cuando termine
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
    }
}

/**
 * POST /import/ventas
 * Importa ventas desde una ruta física en el servidor (Ej. automatizaciones locales)
 */
async function importarVentas(req, res) {
    try {
        const { rutaArchivo } = req.body;
        const batchSizeInput = parseInt(req.body.batchSize, 10);
        const batchSize = Number.isFinite(batchSizeInput)
            ? Math.max(1000, Math.min(batchSizeInput, 20000))
            : 1000;

        if (!rutaArchivo || !fs.existsSync(rutaArchivo)) {
            return res.status(404).json({
                error: 'Archivo no encontrado',
                mensaje: `El archivo ${rutaArchivo || 'no especificado'} no existe en el servidor.`
            });
        }

        const stats = fs.statSync(rutaArchivo);
        const tamanoMB = (stats.size / (1024 * 1024)).toFixed(2);

        const importador = new ImportadorVentasOptimizado(models.sequelize, models);
        importador.BATCH_SIZE = batchSize;

        const estadisticas = await importador.importar(rutaArchivo);

        return res.status(200).json({
            mensaje: 'Importación local completada exitosamente',
            archivo: rutaArchivo,
            tamano_mb: parseFloat(tamanoMB),
            estadisticas: {
                procesados: estadisticas.procesados,
                insertados: estadisticas.insertados,
                errores: estadisticas.errores,
                tiempo: estadisticas.duracion
            }
        });

    } catch (error) {
        console.error('Error en importarVentas local:', error);
        return res.status(500).json({
            error: 'Error en la importación local',
            mensaje: error.message
        });
    }
}

/**
 * GET /import/status
 * Verifica el estado de la conexión a la base de datos (Neon DB / Local)
 */
async function verificarEstado(req, res) {
    try {
        await models.sequelize.authenticate();
        return res.status(200).json({
            estado: 'Operativo',
            mensaje: 'Conexión a la base de datos exitosa',
            base_datos: models.sequelize.config.database,
            host: models.sequelize.config.host,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en verificarEstado:', error);
        return res.status(503).json({
            estado: 'Error',
            mensaje: 'No se puede conectar a la base de datos',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * POST /import/cuotas/upload
 * Importa cuotas (día/semana/mes) desde un archivo CSV (Lógica intacta)
 */
async function importarCuotasConArchivo(req, res) {
    let archivoProcesado = null;

    try {
        req.setTimeout(30 * 60 * 1000);
        res.setTimeout(30 * 60 * 1000);

        if (!req.file) {
            return res.status(400).json({
                error: 'Archivo requerido',
                mensaje: 'Debes adjuntar un archivo CSV en el campo "archivo"'
            });
        }

        const extension = path.extname(req.file.originalname || '').toLowerCase();
        if (extension !== '.csv') {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Tipo de archivo inválido',
                mensaje: 'Para este endpoint solo se permiten archivos .csv'
            });
        }

        const rutaArchivo = req.file.path;
        const nombreArchivo = req.file.originalname;
        const tamanoMB = (req.file.size / (1024 * 1024)).toFixed(2);
        const yearInput = req.body.year;

        archivoProcesado = rutaArchivo;

        const options = {};
        if (yearInput !== undefined && yearInput !== null && String(yearInput).trim() !== '') {
            options.year = Number(yearInput);
        }

        const resultado = await importCuotasService.importFromFile(rutaArchivo, options);

        if (archivoProcesado && fs.existsSync(archivoProcesado)) {
            fs.unlinkSync(archivoProcesado);
        }

        if (res.headersSent) return;
        return res.status(200).json({
            mensaje: 'Importación de cuotas completada exitosamente',
            archivo: nombreArchivo,
            tamano_mb: parseFloat(tamanoMB),
            resumen: resultado
        });
    } catch (error) {
        console.error('Error en importarCuotasConArchivo:', error);
        if (archivoProcesado && fs.existsSync(archivoProcesado)) {
            fs.unlinkSync(archivoProcesado);
        }
        if (res.headersSent) return;
        return res.status(500).json({
            error: 'Error en la importación de cuotas',
            mensaje: error.message,
            detalle: error.stack?.split('\n')[1]?.trim()
        });
    }
}

module.exports = {
    importarVentas,
    importarVentasConArchivo,
    verificarEstado,
    importarCuotasConArchivo
};