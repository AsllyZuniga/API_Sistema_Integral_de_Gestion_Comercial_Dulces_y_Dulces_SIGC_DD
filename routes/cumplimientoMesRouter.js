var express = require('express');
var router = express.Router();
const cumplimientoMesController = require('../controllers').cumplimientoMesController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Rutas específicas sin parámetros (PRIMERO)
router.get('/front/me', requireAuthJWT, cumplimientoMesController.listFrontMe);
router.get('/front', requireAuthJWT, cumplimientoMesController.listFront);
router.get('/ciudades-global', requireAuthJWT, cumplimientoMesController.getCiudadesGlobal);
// Issue #2: /lineas ahora es role-aware desde JWT (admin ve todas, supervisor ve su equipo, vendedor ve solo suyas)
router.get('/lineas', requireAuthJWT, cumplimientoMesController.getLineas);

// Rutas con parámetros anidados
router.get('/vendedor/:codigoVendedor/linea/:codigoLinea', requireAuthJWT, cumplimientoMesController.getLineaEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/lineas', requireAuthJWT, cumplimientoMesController.getLineasPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudades', requireAuthJWT, cumplimientoMesController.getCiudadesPorVendedor);
router.get('/vendedor/:codigoVendedor/ciudad/:idCiudad', requireAuthJWT, cumplimientoMesController.getCiudadEspecificaPorVendedor);
router.get('/vendedor/:codigoVendedor/productos', requireAuthJWT, cumplimientoMesController.getProductosPorVendedor);
router.get('/vendedor/:codigoVendedor', requireAuthJWT, cumplimientoMesController.getByVendedor);

// Rutas genéricas (AL FINAL)
router.get('/', requireAuthJWT, cumplimientoMesController.list);
router.get('/:codigo', requireAuthJWT, cumplimientoMesController.getByCodigo);

module.exports = router;
