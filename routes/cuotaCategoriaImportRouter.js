const express = require('express');
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/cuotaCategoriaImportController');

const router = express.Router();

// Configurar multer para subir archivos al directorio uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads');
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Solo aceptar CSVs
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos CSV'), false);
        }
    }
});

/**
 * GET /cuota-categoria-import/
 * Obtiene instrucciones completas para importación
 */
router.get('/', controller.getInstrucciones);

/**
 * POST /cuota-categoria-import/cargar
 * Importa cuotas desde un archivo CSV con validaciones estrictas
 * 
 * ⭐ FORMA SIMPLIFICADA: Las fechas se extraen automáticamente del CSV
 * 
 * Parámetros form-data:
 * - archivo: Archivo CSV (requerido)
 *   Estructura esperada:
 *   - Columna 1: nombre (vendedor)
 *   - Columna 2: codigo_vendedor (debe existir en BD)
 *   - Columnas 3 a N-2: categorías (nombres exactos de BD)
 *   - Penúltima: fecha_inicio (YYYY-MM-DD)
 *   - Última: fecha_fin (YYYY-MM-DD)
 * 
 * Ejemplo curl:
 * curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
 *   -F "archivo=@cuotasCategoriasMarzo.csv"
 * 
 * ✅ MODO ESTRICTO:
 * - Valida que TODOS los vendedores existan
 * - Valida que TODAS las categorías existan
 * - Si hay errores, CANCELA importación
 * - NO crea ni duplica vendedores ni categorías
 */
router.post('/cargar', upload.single('archivo'), controller.importarConArchivo);

/**
 * POST /cuota-categoria-import/validar
 * Valida el archivo SIN importar (Recomendado: validar primero)
 * 
 * Parámetros: solo archivo CSV (fechas extraídas automáticamente)
 * 
 * Retorna: reporte detallado de validación sin hacer cambios en BD
 * 
 * Ejemplo curl:
 * curl -X POST http://localhost:3000/cuota-categoria-import/validar \
 *   -F "archivo=@cuotasCategoriasMarzo.csv"
 */
router.post('/validar', upload.single('archivo'), controller.validarArchivo);

/**
 * POST /cuota-categoria-import/importar/nestle
 * Importa cuotas desde ruta de archivo JSON (para archivos ya en servidor)
 * 
 * Body JSON:
 * {
 *   "rutaArchivo": "ruta/al/archivo.csv" (requerido),
 *   "mesAnio": "2026-03" (RECOMENDADO),
 *   // O alternativa:
 *   "fechaInicio": "2026-03-01",
 *   "fechaFin": "2026-03-31"
 * }
 */
router.post('/importar/nestle', controller.importarCuotasNestle);

/**
 * GET /cuota-categoria-import/actuales
 * Obtiene todas las cuotas de categoría cargadas en la BD
 */
router.get('/actuales', controller.obtenerCuotasActuales);

module.exports = router;

