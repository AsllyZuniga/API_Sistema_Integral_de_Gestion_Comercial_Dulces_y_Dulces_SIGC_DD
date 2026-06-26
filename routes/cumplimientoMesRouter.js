var express = require('express');
var router = express.Router();
const cumplimientoMesController = require('../controllers').cumplimientoMesController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Rutas específicas sin parámetros (PRIMERO)
router.get('/front/me', requireAuthJWT, cumplimientoMesController.listFrontMe);
router.get('/front', cumplimientoMesController.listFront);
router.get('/ciudades-global', cumplimientoMesController.getCiudadesGlobal);
// Issue #2: /lineas ahora es role-aware desde JWT (admin ve todas, supervisor ve su equipo, vendedor ve solo suyas)
router.get('/lineas', requireAuthJWT, cumplimientoMesController.getLineas);

// Rutas con parámetros anidados
router.get('/vendedor/:codigoVendedor/linea/:codigoLinea', cumplimientoMesController.getLineaEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/lineas', cumplimientoMesController.getLineasPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudades', cumplimientoMesController.getCiudadesPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudad/:idCiudad', cumplimientoMesController.getCiudadEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/productos', cumplimientoMesController.getProductosPorVendedor);
router.get('/vendedor/:codigoVendedor', cumplimientoMesController.getByVendedor);

// Rutas genéricas (AL FINAL)
router.get('/', cumplimientoMesController.list);
router.get('/:codigo', cumplimientoMesController.getByCodigo);

module.exports = router;
