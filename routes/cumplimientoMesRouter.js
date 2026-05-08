var express = require('express');
var router = express.Router();
const cumplimientoMesController = require('../controllers').cumplimientoMesController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/front/me', requireAuthJWT, cumplimientoMesController.listFrontMe);
router.get('/front', cumplimientoMesController.listFront);
router.get('/lineas', cumplimientoMesController.getLineas);
router.get('/', cumplimientoMesController.list);
router.get('/vendedor/:codigoVendedor', cumplimientoMesController.getByVendedor);
router.get('/vendedor/:codigoVendedor/linea/:codigoLinea', cumplimientoMesController.getLineaEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/lineas', cumplimientoMesController.getLineasPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudades', cumplimientoMesController.getCiudadesPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudad/:idCiudad', cumplimientoMesController.getCiudadEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/productos', cumplimientoMesController.getProductosPorVendedor);
router.get('/:codigo', cumplimientoMesController.getByCodigo);

module.exports = router;
