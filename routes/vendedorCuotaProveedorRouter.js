const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendedorCuotaProveedorController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAdminCuotas } = require('../middlewares/requireAdminCuotas');

router.get('/',                          requireAuthJWT, ctrl.getAll);
router.get('/vendedor/:id_vendedor',     requireAuthJWT, ctrl.getByVendedor);
router.get('/proveedor/:id_proveedor',   requireAuthJWT, ctrl.getByProveedor);
router.post('/upload',                   requireAuthJWT, ctrl.uploadCSV);
router.get('/:id',                       requireAuthJWT, ctrl.getById);
router.post('/',                         requireAuthJWT, ctrl.create);
router.put('/:id',                       requireAdminCuotas, ctrl.updateById);
router.delete('/:id',                    requireAuthJWT, ctrl.deleteById);

/**
 * DELETE /vendedor-cuota-proveedor/rango?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las asignaciones de cuota de proveedor en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', requireAuthJWT, ctrl.deleteByDateRange);

module.exports = router;