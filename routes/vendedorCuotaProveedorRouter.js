const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendedorCuotaProveedorController');

router.get('/',                          ctrl.getAll);
router.get('/vendedor/:id_vendedor',     ctrl.getByVendedor);
router.get('/proveedor/:id_proveedor',   ctrl.getByProveedor);
router.post('/upload',                   ctrl.uploadCSV);
router.get('/:id',                       ctrl.getById);
router.post('/',                         ctrl.create);
router.put('/:id',                       ctrl.updateById);
router.delete('/:id',                    ctrl.deleteById);

/**
 * DELETE /vendedor-cuota-proveedor/rango?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las asignaciones de cuota de proveedor en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', ctrl.deleteByDateRange);

module.exports = router;