var express = require('express');
var router = express.Router();
const vendedorController = require('../controllers').vendedorController;
router.get('/', vendedorController.list);
router.get('/:id', vendedorController.getById);
router.post('/', vendedorController.add);
router.put('/:id', vendedorController.update);
router.put('/:id/asignar-supervisor', vendedorController.assignSupervisor);
module.exports = router;