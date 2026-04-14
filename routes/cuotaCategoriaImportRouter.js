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

// GET - Instrucciones
router.get('/', controller.getInstrucciones);

// POST - Importar con archivo en multipart/form-data
router.post('/cargar', upload.single('archivo'), controller.importarConArchivo);

// POST - Importar con ruta de archivo en JSON
router.post('/importar/nestle', controller.importarCuotasNestle);

// GET - Obtener cuotas actuales
router.get('/actuales', controller.obtenerCuotasActuales);

module.exports = router;

