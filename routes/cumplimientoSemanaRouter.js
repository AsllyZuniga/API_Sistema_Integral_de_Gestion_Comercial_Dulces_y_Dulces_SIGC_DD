const express = require('express');
const router = express.Router();
const controller = require('../controllers/cumplimientoSemanaController');
const cumplimientoSemanaService = require('../services/cumplimientoSemana');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/front/me', requireAuthJWT, controller.listFrontMe);
router.get('/front', controller.listFront);

// Issue #2: /lineas role-aware desde JWT (consolidado, sin N+1)
router.get('/lineas', requireAuthJWT, async (req, res) => {
    try {
        const data = await cumplimientoSemanaService.getLineasGeneralSemana(req.query, req.auth);
        return res.status(200).send(data);
    } catch (error) {
        return res.status(400).send(error);
    }
});

// Microtarea B5/B6: /ciudades role-aware desde JWT (consolidado, sin N+1)
router.get('/ciudades', requireAuthJWT, async (req, res) => {
    try {
        const data = await cumplimientoSemanaService.getCiudadesGeneralSemana(req.query, req.auth);
        return res.status(200).send(data);
    } catch (error) {
        return res.status(400).send(error);
    }
});

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
