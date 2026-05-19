const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendedorCuotaCategoriaController');

// Rutas especiales PRIMERO (antes de :id)
/**
 * GET /vendedor-cuota-categoria/debug/todas-fechas
 * Obtiene todos los registros con sus fechas (sin filtrar) - para DEBUG
 */
router.get('/debug/todas-fechas', ctrl.getAllWithDates);

/**
 * GET /vendedor-cuota-categoria/debug/comparar?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Debug de comparación de fechas - muestra qué registros deberían coincidir
 */
router.get('/debug/comparar', ctrl.debugDates);

/**
 * GET /vendedor-cuota-categoria/rango/consultar?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Obtiene todas las asignaciones de cuota de categoría en el rango de fechas especificado (para debug)
 */
router.get('/rango/consultar', ctrl.getByDateRange);

// Rutas con parámetros dinámicos DESPUÉS
router.get('/', ctrl.getAll);
router.get('/vendedor/:id_vendedor', ctrl.getByVendedor);
router.get('/categoria/:id_categoria', ctrl.getByCategoria);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.updateById);
router.delete('/:id', ctrl.deleteById);

/**
 * DELETE /vendedor-cuota-categoria/rango/por-fechas?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las asignaciones de cuota de categoría en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', ctrl.deleteByDateRange);

module.exports = router;
