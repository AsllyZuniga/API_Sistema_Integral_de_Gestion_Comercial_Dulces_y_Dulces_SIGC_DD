var express = require('express');
var router = express.Router();
const filtrosController = require('../controllers/filtrosController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

// GET /api/filtros/opciones
// Devuelve las opciones de los 4 desplegables (vendedor, proveedor,
// categoría, ciudad) en cascada a partir de los query params y el rol
// del JWT. Endpoint único para repoblar los filtros del dashboard.
router.get('/opciones', requireAuthJWT, filtrosController.getOpciones);

module.exports = router;
