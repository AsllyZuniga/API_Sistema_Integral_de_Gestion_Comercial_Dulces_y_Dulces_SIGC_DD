const express = require('express');
const router = express.Router();
const controller = require('../controllers/cumplimientoSemanaController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// Para el vendedor autenticado ("Mi cumplimiento semanal")
router.get('/front/me', requireAuthJWT, controller.listFrontMe);
// Para admins/supervisores (todos los vendedores)
router.get('/front', controller.listFront);
// Para obtener el cumplimiento de un vendedor específico

// Por proveedor (líneas)
router.get('/lineas/:codigoVendedor', controller.getLineasPorVendedor);
// Por proveedor específico
router.get('/lineas/:codigoVendedor/:codigoLinea', controller.getLineaEspecificaPorVendedor);
// Por ciudad
router.get('/ciudades/:codigoVendedor', controller.getCiudadesPorVendedor);
// Por producto/item
router.get('/productos/:codigoVendedor', controller.getProductosPorVendedor);

// Por vendedor específico (general)
router.get('/:codigo', controller.getByCodigo);

module.exports = router;
