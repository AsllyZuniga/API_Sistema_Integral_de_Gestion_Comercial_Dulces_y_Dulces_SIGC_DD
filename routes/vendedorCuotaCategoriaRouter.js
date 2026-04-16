const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendedorCuotaCategoriaController');

router.get('/',                          ctrl.getAll);
router.get('/vendedor/:id_vendedor',     ctrl.getByVendedor);
router.get('/categoria/:id_categoria',   ctrl.getByCategoria);
router.get('/:id',                       ctrl.getById);
router.post('/',                         ctrl.create);
router.put('/:id',                       ctrl.updateById);
router.delete('/:id',                    ctrl.deleteById);

module.exports = router;
