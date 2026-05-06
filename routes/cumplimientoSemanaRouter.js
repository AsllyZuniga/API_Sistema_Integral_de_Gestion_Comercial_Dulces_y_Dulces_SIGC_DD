const express = require('express');
const router = express.Router();
const controller = require('../controllers/cumplimientoSemanaController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/front/me', requireAuthJWT, controller.listFrontMe);
router.get('/front', controller.listFront);

router.get('/vendedor/:codigoVendedor/lineas', controller.getLineasPorVendedor);
router.get('/vendedor/:codigoVendedor/linea/:codigoLinea', controller.getLineaEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudades', controller.getCiudadesPorVendedor);
router.get('/vendedor/:codigoVendedor/productos', controller.getProductosPorVendedor);

// Rutas legacy
router.get('/lineas/:codigoVendedor', controller.getLineasPorVendedor);
router.get('/lineas/:codigoVendedor/:codigoLinea', controller.getLineaEspecificaPorVendedor);
router.get('/ciudades/:codigoVendedor', controller.getCiudadesPorVendedor);
router.get('/productos/:codigoVendedor', controller.getProductosPorVendedor);

router.get('/:codigo', controller.getByCodigo);

module.exports = router;
