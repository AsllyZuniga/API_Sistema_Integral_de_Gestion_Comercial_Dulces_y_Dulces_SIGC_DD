const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    importarVentas,
    importarVentasConArchivo,
    verificarEstado,
    importarCuotasConArchivo
} = require('../controllers/importController');

/**
 * Configurar multer para manejar uploads de TSV
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Guardar en carpeta temporal
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nombre único para evitar conflictos
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        cb(null, `${timestamp}-${random}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Validar extensión
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.txt' && ext !== '.tsv' && ext !== '.csv') {
            return cb(new Error('Solo se permiten archivos .txt, .tsv o .csv'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5000 * 1024 * 1024 // Máximo 5GB para archivos gigantes
    }
});

const uploadCsvOnly = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.csv') {
            return cb(new Error('Para cuotas solo se permiten archivos .csv'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5000 * 1024 * 1024 // Máximo 5GB
    }
});

/**
 * Rutas para importación de datos
 */

// Verificar estado del servicio
router.get('/status', verificarEstado);

// Importar ventas desde archivo CARGADO (Postman/Frontend)
router.post('/ventas/upload', upload.single('archivo'), importarVentasConArchivo);

// Importar ventas desde ruta en servidor (Node.js)
router.post('/ventas', importarVentas);

// Importar cuotas desde archivo CSV cargado (Postman/Frontend)
router.post('/cuotas/upload', uploadCsvOnly.single('archivo'), importarCuotasConArchivo);

module.exports = router;
