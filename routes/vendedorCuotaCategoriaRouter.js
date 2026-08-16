const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendedorCuotaCategoriaController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAdminCuotas } = require('../middlewares/requireAdminCuotas');

// Rutas especiales PRIMERO (antes de :id)
/**
 * GET /vendedor-cuota-categoria/debug/todas-fechas
 * Obtiene todos los registros con sus fechas (sin filtrar) - para DEBUG
 */
router.get('/debug/todas-fechas', requireAuthJWT, ctrl.getAllWithDates);

/**
 * GET /vendedor-cuota-categoria/debug/comparar?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Debug de comparación de fechas - muestra qué registros deberían coincidir
 */
router.get('/debug/comparar', requireAuthJWT, ctrl.debugDates);

/**
 * GET /vendedor-cuota-categoria/rango/consultar?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Obtiene todas las asignaciones de cuota de categoría en el rango de fechas especificado (para debug)
 */
router.get('/rango/consultar', requireAuthJWT, ctrl.getByDateRange);

// Rutas con parámetros dinámicos DESPUÉS
router.get('/', requireAuthJWT, ctrl.getAll);
router.get('/vendedor/:id_vendedor', requireAuthJWT, ctrl.getByVendedor);
router.get('/categoria/:id_categoria', requireAuthJWT, ctrl.getByCategoria);
router.get('/:id', requireAuthJWT, ctrl.getById);
router.post('/', requireAuthJWT, ctrl.create);
router.put('/:id', requireAdminCuotas, ctrl.updateById);
router.delete('/:id', requireAuthJWT, ctrl.deleteById);

/**
 * DELETE /vendedor-cuota-categoria/rango/por-fechas?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las asignaciones de cuota de categoría en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', requireAuthJWT, ctrl.deleteByDateRange);

module.exports = router;
