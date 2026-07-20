var express = require('express');
var router = express.Router();
const vendedorController = require('../controllers').vendedorController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAccesoGestionUsuarios } = require('../middlewares/requireAccesoGestionUsuarios');

// Rutas específicas deben ir ANTES de rutas parametrizadas
router.get('/con-items-comprados', requireAuthJWT, vendedorController.getConClientesItems);

// Ruta obsoleta (a partir de v1.1.0). Responde 410 con la URL correcta.
// Debe ir ANTES de /supervisor/:id_supervisor para que no sea capturada por el parámetro.
router.get('/supervisor/con-items-comprados', requireAuthJWT, vendedorController.deprecatedSupervisorConItems);

router.get('/', requireAuthJWT, vendedorController.list);
router.get('/supervisor/:id_supervisor', requireAuthJWT, vendedorController.getBySupervisor);
router.get('/:id', requireAuthJWT, vendedorController.getById);
router.post('/', requireAccesoGestionUsuarios, vendedorController.add);
router.put('/:id', requireAccesoGestionUsuarios, vendedorController.update);
router.put('/:id/asignar-supervisor', requireAccesoGestionUsuarios, vendedorController.assignSupervisor);
router.put('/:id/quitar-supervisor', requireAccesoGestionUsuarios, vendedorController.removeSupervisor);
router.put('/asignar-supervisor-masivo', requireAccesoGestionUsuarios, vendedorController.assignSupervisorBulk);
module.exports = router;