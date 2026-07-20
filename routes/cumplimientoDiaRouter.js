var express = require('express');
var router = express.Router();
const cumplimientoDiaController = require('../controllers/cumplimientoDiaController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Rutas específicas sin parámetros (PRIMERO)
router.get('/front/me', requireAuthJWT, cumplimientoDiaController.listFrontMe);
router.get('/front', requireAuthJWT, cumplimientoDiaController.listFront);
router.get('/vendedores', requireAuthJWT, cumplimientoDiaController.listFrontVendedores);

// Rutas con parámetros
router.get('/vendedor/:codigoVendedor', requireAuthJWT, cumplimientoDiaController.getByVendedor);
router.get('/supervisor/:idSupervisor', requireAuthJWT, cumplimientoDiaController.getBySupervisor);

module.exports = router;
