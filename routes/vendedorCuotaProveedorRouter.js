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

module.exports = router;