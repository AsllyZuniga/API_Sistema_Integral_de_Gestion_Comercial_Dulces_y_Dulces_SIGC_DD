const ImportadorVentasOptimizado = require('../services/importventas-optimizado');
const models = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * POST /import/ventas/upload
 * Importa ventas desde un archivo TSV cargado vía multipart/form-data
 */
async function importarVentasConArchivo(req, res) {
    let archivoProcesado = null;

    try {
        // Configurar timeout para archivos de varios GB (3 horas)
        req.setTimeout(3 * 60 * 60 * 1000);
        res.setTimeout(3 * 60 * 60 * 1000);

        // Enviar headers inmediatamente para mantener conexión activa
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        });

        if (!req.file) {
            res.end(JSON.stringify({
                error: 'Archivo requerido',
                mensaje: 'Debes adjuntar un archivo TSV en el campo "archivo"'
            }));
            return;
        }

        const rutaArchivo = req.file.path;
        const nombreArchivo = req.file.originalname;
        const tamanoMB = (req.file.size / (1024 * 1024)).toFixed(2);
        const batchSize = parseInt(req.body.batchSize) || 20000;

        console.log(`\n🚀 Iniciando importación desde upload: ${nombreArchivo}`);
        console.log(`📊 Tamaño: ${tamanoMB} MB`);
        console.log(`⚙️  Batch size: ${batchSize}`);

        // Enviar mensaje inicial
        res.write(`{"status":"iniciando","mensaje":"Procesando archivo ${nombreArchivo} (${tamanoMB} MB)","timestamp":"${new Date().toISOString()}"}\n`);

        archivoProcesado = rutaArchivo;

        const importador = new ImportadorVentasOptimizado(models.sequelize, models);
        importador.verbose = true;

        // Configurar callback para updates de progreso (archivos gigantes)
        let intervalId = setInterval(() => {
            const memoriaUsada = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            res.write(`{"status":"procesando","mensaje":"Importación en progreso... RAM: ${memoriaUsada}MB","timestamp":"${new Date().toISOString()}"}\n`);
        }, 30000); // Cada 30 segundos para archivos GB

        try {
            const estadisticas = await importador.importar(rutaArchivo);
            
            // Limpiar interval
            clearInterval(intervalId);

            if (fs.existsSync(rutaArchivo)) {
                fs.unlinkSync(rutaArchivo);
            }

            // Enviar resultado final
            const resultado = {
                status: "completado",
                mensaje: 'Importación completada exitosamente',
                archivo: nombreArchivo,
                tamano_mb: parseFloat(tamanoMB),
                estadisticas: {
                    registrosExitosos: estadisticas.exitosas,
                    registrosConError: estadisticas.errores,
                    totalRegistros: estadisticas.totalLineas,
                    tiempoSegundos: ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000).toFixed(2),
                    registrosPorSegundo: (estadisticas.exitosas / ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000)).toFixed(2)
                },
                erroresDetallados: estadisticas.erroresDetallados.slice(0, 10),
                timestamp: new Date().toISOString()
            };

            res.end(JSON.stringify(resultado));

        } catch (importError) {
            // Limpiar interval en caso de error
            clearInterval(intervalId);
            
            console.error('Error durante importación:', importError);

            if (archivoProcesado && fs.existsSync(archivoProcesado)) {
                fs.unlinkSync(archivoProcesado);
            }

            const errorResult = {
                status: "error",
                error: 'Error en la importación',
                mensaje: importError.message,
                timestamp: new Date().toISOString()
            };

            res.end(JSON.stringify(errorResult));
        }

    } catch (error) {
        // Manejo de errores generales (configuración, etc.)
        console.error('Error general en importarVentasConArchivo:', error);
        
        const errorResult = {
            status: "error",
            error: 'Error en la configuración de importación',
            mensaje: error.message,
            timestamp: new Date().toISOString()
        };

        if (res.headersSent) {
            res.end(JSON.stringify(errorResult));
        } else {
            res.status(500).json(errorResult);
        }
    }
}

/**
 * POST /import/ventas
 * Importa ventas desde una ruta en el servidor
 */
async function importarVentas(req, res) {
    try {
        const { rutaArchivo, batchSize = 100 } = req.body;

        if (!rutaArchivo) {
            return res.status(400).json({
                error: 'Ruta de archivo requerida',
                mensaje: 'Debes proporcionar "rutaArchivo" en el body'
            });
        }

        if (!fs.existsSync(rutaArchivo)) {
            return res.status(404).json({
                error: 'Archivo no encontrado',
                mensaje: `El archivo ${rutaArchivo} no existe`
            });
        }

        const stats = fs.statSync(rutaArchivo);
        const tamanoMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`\n🚀 Iniciando importación desde ruta: ${rutaArchivo}`);
        console.log(`📊 Tamaño: ${tamanoMB} MB`);
        console.log(`⚙️  Batch size: ${batchSize}`);

        const importador = new ImportadorVentas(models.sequelize, models);
        importador.batchSize = batchSize;
        importador.verbose = true;

        const estadisticas = await importador.importar(rutaArchivo);

        return res.status(200).json({
            mensaje: 'Importación completada exitosamente',
            archivo: rutaArchivo,
            tamano_mb: parseFloat(tamanoMB),
            estadisticas: {
                registrosExitosos: estadisticas.exitosas,
                registrosConError: estadisticas.errores,
                totalRegistros: estadisticas.totalLineas,
                tiempoSegundos: ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000).toFixed(2),
                registrosPorSegundo: (estadisticas.exitosas / ((estadisticas.tiempoFin - estadisticas.tiempoInicio) / 1000)).toFixed(2)
            },
            erroresDetallados: estadisticas.erroresDetallados.slice(0, 10)
        });

    } catch (error) {
        console.error('Error en importarVentas:', error);

        return res.status(500).json({
            error: 'Error en la importación',
            mensaje: error.message
        });
    }
}

/**
 * GET /import/status
 * Verifica el estado de la conexión a la base de datos
 */
async function verificarEstado(req, res) {
    try {
        await models.sequelize.authenticate();

        return res.status(200).json({
            estado: 'Operativo',
            mensaje: 'Conexión a la base de datos exitosa',
            base_datos: models.sequelize.config.database,
            host: models.sequelize.config.host,
            puerto: models.sequelize.config.port,
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

module.exports = {
    importarVentas,
    importarVentasConArchivo,
    verificarEstado
};