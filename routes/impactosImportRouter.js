const express = require('express');
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/impactosImportController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAdmin } = require('../middlewares/requireAdmin');

const router = express.Router();

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
        if (file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos CSV'), false);
        }
    }
});

/**
 * GET /api/impactos-import/
 * Instrucciones y documentación de todos los endpoints
 */
router.get('/', requireAuthJWT, controller.getInstrucciones);

/**
 * POST /api/impactos-import/clientes/cargar
 * Importa impactos por CLIENTE (formato ANCHO: periodos en columnas)
 * SOLO ADMIN — archivo DEBE llamarse con "impactos_cliente" en el nombre
 *
 * curl -X POST http://localhost:3000/api/impactos-import/clientes/cargar \
 *   -F "archivo=@impactos_clientes.csv"
 */
router.post('/clientes/cargar', requireAdmin, upload.single('archivo'), controller.cargar);

/**
 * POST /api/impactos-import/categorias/cargar
 * Importa impactos por CATEGORÍA (formato VERTICAL: fila por periodo)
 * SOLO ADMIN — archivo DEBE llamarse con "impactos_categoria" en el nombre
 *
 * curl -X POST http://localhost:3000/api/impactos-import/categorias/cargar \
 *   -F "archivo=@impactos_categoria.csv"
 */
router.post('/categorias/cargar', requireAdmin, upload.single('archivo'), controller.cargar);

/**
 * POST /api/impactos-import/proveedores/cargar
 * Importa impactos por PROVEEDOR (formato VERTICAL: fila por periodo)
 * SOLO ADMIN — archivo DEBE llamarse con "impactos_proveedor" en el nombre
 *
 * curl -X POST http://localhost:3000/api/impactos-import/proveedores/cargar \
 *   -F "archivo=@impactos_proveedores.csv"
 */
router.post('/proveedores/cargar', requireAdmin, upload.single('archivo'), controller.cargar);

/**
 * PUT /api/impactos-import/:tipo/:id
 * Actualiza la cuota de un impacto existente (SOLO ADMIN).
 * Body: { "cuota": 12345 }
 */
router.put('/:tipo/:id', requireAdmin, controller.actualizar);

/**
 * DELETE /api/impactos-import/:tipo/:id
 * Elimina un impacto existente (SOLO ADMIN).
 */
router.delete('/:tipo/:id', requireAdmin, controller.eliminar);

/**
 * DELETE /api/impactos-import/:tipo
 * Elimina impactos en BULK (SOLO ADMIN).
 * Query:
 *  - vendedor=codigo (obligatorio) — también acepta vendedor_id=id
 *  - fechaInicio=YYYY-MM-DD (opcional)
 *  - fechaFin=YYYY-MM-DD (opcional)
 * Si no llegan fechas, borra TODO el histórico del vendedor+tipo.
 *
 * Ej: DELETE /api/impactos-import/clientes?vendedor=150&fechaInicio=2026-05-01&fechaFin=2026-05-31
 */
router.delete('/:tipo', requireAdmin, controller.eliminarBulk);

/**
 * GET /api/impactos-import/:tipo
 * Consulta impactos cargados. tipo = clientes | categorias | proveedores
 *
 * Alcance por rol (JWT):
 *  - admin (rol=1)     → todos los impactos + filtro vendedor
 *  - supervisor (rol=2)→ solo su equipo (filtro vendedor ignorado)
 *  - vendedor (rol=3)  → solo él mismo (filtro vendedor ignorado)
 *
 * Query opcionales:
 *  - fechaInicio=YYYY-MM-DD, fechaFin=YYYY-MM-DD
 *  - tipoPeriodo=SEMANAL|MENSUAL
 *  - vendedor (solo admin), categoria, proveedor
 *  - canal, ciudad
 */
router.get('/:tipo', requireAuthJWT, controller.obtener);

module.exports = router;