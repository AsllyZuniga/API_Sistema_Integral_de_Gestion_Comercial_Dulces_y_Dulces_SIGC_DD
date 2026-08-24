var express = require('express');
var router = express.Router();
const filtrosController = require('../controllers/filtrosController');
const filtrosImpactosController = require('../controllers/filtrosImpactosController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// GET /api/filtros/opciones
// Devuelve las opciones de los 4 desplegables (vendedor, proveedor,
// categoría, ciudad) en cascada a partir de los query params y el rol
// del JWT. Endpoint único para repoblar los filtros del dashboard.
router.get('/opciones', requireAuthJWT, filtrosController.getOpciones);

// GET /api/filtros/opciones-impactos
// Devuelve las opciones de los desplegables (vendedor, proveedor,
// categoría) en cascada para el Análisis de Impactos, filtrando por
// datos de cuota (tablas impactos_cliente/proveedor/categoria).
router.get('/opciones-impactos', requireAuthJWT, filtrosImpactosController.getOpciones);

module.exports = router;
