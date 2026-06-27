var express = require('express');
var router = express.Router();
const cuotaCategoriaController = require('../controllers').cuotaCategoriaController;
const cuotaCategoriaValidadorController = require('../controllers/cuotaCategoriaValidadorController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

/**
 * GET /cuota-categoria/general
 * Endpoint ÚNICO y role-aware (usa el JWT para filtrar por rol):
 *   - Admin (rol 1)      → todas las categorías de todos los vendedores
 *   - Supervisor (rol 2) → categorías de su equipo
 *   - Vendedor (rol 3)   → solo sus categorías
 *
 * Parámetros query (opcionales):
 * - mesAnio: Formato YYYY-MM (ej: 2026-03) - RECOMENDADO
 * - fechaInicio: Formato YYYY-MM-DD (alternativa)
 * - fechaFin: Formato YYYY-MM-DD (alternativa)
 *
 * Ejemplos:
 * /cuota-categoria/general?mesAnio=2026-03
 * /cuota-categoria/general?fechaInicio=2026-03-01&fechaFin=2026-03-31
 */
router.get('/general', requireAuthJWT, cuotaCategoriaController.general);

// ✅ ENDPOINTS DE VALIDACIÓN DE CUOTAS
router.get('/validar/marzo', cuotaCategoriaValidadorController.validateCuotasMarzo);
router.post('/validar/comparar-csv', cuotaCategoriaValidadorController.compareCuotasConCSV);

/**
 * DELETE /cuota-categoria/:id
 * Elimina una cuota de categoría por ID
 */
router.delete('/:id', cuotaCategoriaController.deleteById);

/**
 * DELETE /cuota-categoria/rango/por-fechas?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las cuotas de categoría en el rango de fechas especificado
 */
router.delete('/rango/por-fechas', cuotaCategoriaController.deleteByDateRange);

module.exports = router;
