'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/impactosController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

/**
 * GET /api/impactos/vendedores
 * Impactos por VENDEDOR (tabla agregada):
 *  - cuotaImpactos (cuota MENSUAL/SEMANAL de impactos_cliente)
 *  - impactos       (clientes con venta > 0 en el periodo)
 *  - porcCump       (impactos / cuota * 100)
 *  - faltan         (cuota - impactos)
 *
 * Query: fechaInicio, fechaFin, tipoPeriodo (SEMANAL|MENSUAL),
 *        vendedor (solo admin), canal, ciudad
 */
router.get('/vendedores', requireAuthJWT, controller.vendedores);

/**
 * GET /api/impactos/proveedores
 * Impactos por PROVEEDOR (agregado sobre impactos_proveedor + ventas).
 */
router.get('/proveedores', requireAuthJWT, controller.proveedores);

/**
 * GET /api/impactos/categorias
 * Impactos por CATEGORÍA (agregado sobre impactos_categoria + ventas).
 */
router.get('/categorias', requireAuthJWT, controller.categorias);

module.exports = router;
