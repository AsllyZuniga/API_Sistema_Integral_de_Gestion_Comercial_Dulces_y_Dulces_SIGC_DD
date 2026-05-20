var express = require('express');
var router = express.Router();
const vendedorController = require('../controllers').vendedorController;

// Rutas específicas deben ir ANTES de rutas parametrizadas
router.get('/con-items-comprados', vendedorController.getConClientesItems);

router.get('/', vendedorController.list);
router.get('/supervisor/:id_supervisor', vendedorController.getBySupervisor);
router.get('/:id', vendedorController.getById);
router.post('/', vendedorController.add);
router.put('/:id', vendedorController.update);
router.put('/:id/asignar-supervisor', vendedorController.assignSupervisor);
router.put('/:id/quitar-supervisor', vendedorController.removeSupervisor);
router.put('/asignar-supervisor-masivo', vendedorController.assignSupervisorBulk);
module.exports = router;