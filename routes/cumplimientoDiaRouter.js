var express = require('express');
var router = express.Router();
const cumplimientoDiaController = require('../controllers/cumplimientoDiaController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Rutas específicas sin parámetros (PRIMERO)
router.get('/front/me', requireAuthJWT, cumplimientoDiaController.listFrontMe);
router.get('/front', cumplimientoDiaController.listFront);
router.get('/vendedores', cumplimientoDiaController.listFrontVendedores);

// Rutas con parámetros
router.get('/vendedor/:codigoVendedor', cumplimientoDiaController.getByVendedor);
router.get('/supervisor/:idSupervisor', cumplimientoDiaController.getBySupervisor);

module.exports = router;
