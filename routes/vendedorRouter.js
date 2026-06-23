var express = require('express');
var router = express.Router();
const vendedorController = require('../controllers').vendedorController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Rutas específicas deben ir ANTES de rutas parametrizadas
router.get('/con-items-comprados', requireAuthJWT, vendedorController.getConClientesItems);

// Ruta obsoleta (a partir de v1.1.0). Responde 410 con la URL correcta.
// Debe ir ANTES de /supervisor/:id_supervisor para que no sea capturada por el parámetro.
router.get('/supervisor/con-items-comprados', requireAuthJWT, vendedorController.deprecatedSupervisorConItems);

router.get('/', vendedorController.list);
router.get('/supervisor/:id_supervisor', vendedorController.getBySupervisor);
router.get('/:id', vendedorController.getById);
router.post('/', vendedorController.add);
router.put('/:id', vendedorController.update);
router.put('/:id/asignar-supervisor', vendedorController.assignSupervisor);
router.put('/:id/quitar-supervisor', vendedorController.removeSupervisor);
router.put('/asignar-supervisor-masivo', vendedorController.assignSupervisorBulk);
module.exports = router;