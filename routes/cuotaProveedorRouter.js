const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuotaProveedorController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

/**
 * GET /cuota-proveedor
 * Obtiene todas las cuotas de proveedor
 */
router.get('/', requireAuthJWT, ctrl.getAll);

/**
 * GET /cuota-proveedor/:id
 * Obtiene una cuota de proveedor por ID
 */
router.get('/:id', requireAuthJWT, ctrl.getById);

/**
 * POST /cuota-proveedor
 * Crea una nueva cuota de proveedor
 * 
 * Body:
 * {
 *   "cuota": 1000,
 *   "fecha_inicio": "2026-05-01",
 *   "fecha_fin": "2026-05-31"
 * }
 */
router.post('/', requireAuthJWT, ctrl.create);

/**
 * PUT /cuota-proveedor/:id
 * Actualiza una cuota de proveedor
 */
router.put('/:id', requireAuthJWT, ctrl.updateById);

/**
 * DELETE /cuota-proveedor/:id
 * Elimina una cuota de proveedor
 */
router.delete('/:id', requireAuthJWT, ctrl.deleteById);

/**
 * DELETE /cuota-proveedor/rango?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las cuotas de proveedor en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', requireAuthJWT, ctrl.deleteByDateRange);

module.exports = router;
