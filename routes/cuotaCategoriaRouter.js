var express = require('express');
var router = express.Router();
const cuotaCategoriaController = require('../controllers').cuotaCategoriaController;
const cuotaCategoriaValidadorController = require('../controllers/cuotaCategoriaValidadorController');

/**
 * GET /cuota-categoria/vendedores
 * Obtiene cuotas de todas las categorías para todos los vendedores
 * 
 * Parámetros query (opcionales):
 * - mesAnio: Formato YYYY-MM (ej: 2026-03) - RECOMENDADO - Calcula automáticamente el primer y último día
 * - fechaInicio: Formato YYYY-MM-DD (alternativa si no se usa mesAnio)
 * - fechaFin: Formato YYYY-MM-DD (alternativa si no se usa mesAnio)
 * 
 * Ejemplos:
 * /cuota-categoria/vendedores?mesAnio=2026-03
 * /cuota-categoria/vendedores?fechaInicio=2026-03-01&fechaFin=2026-03-31
 */
router.get('/vendedores', cuotaCategoriaController.todosVendedores);

/**
 * GET /cuota-categoria/general
 * Obtiene resumen general de cuotas por categoría
 * 
 * Parámetros query (opcionales):
 * - mesAnio: Formato YYYY-MM (ej: 2026-03) - RECOMENDADO
 * - fechaInicio: Formato YYYY-MM-DD (alternativa)
 * - fechaFin: Formato YYYY-MM-DD (alternativa)
 * 
 * Ejemplos:
 * /cuota-categoria/general?mesAnio=2026-03
 */
router.get('/general', cuotaCategoriaController.general);

/**
 * GET /cuota-categoria/vendedor/:codigoVendedor
 * Obtiene cuotas por categoría para un vendedor específico
 * 
 * Parámetros:
 * - codigoVendedor: Código del vendedor (en la ruta)
 * - mesAnio: Formato YYYY-MM (ej: 2026-03) - RECOMENDADO
 * - fechaInicio: Formato YYYY-MM-DD (alternativa)
 * - fechaFin: Formato YYYY-MM-DD (alternativa)
 * 
 * Ejemplos:
 * /cuota-categoria/vendedor/0150?mesAnio=2026-03
 */
router.get('/vendedor/:codigoVendedor', cuotaCategoriaController.byVendedor);

// ✅ ENDPOINTS DE VALIDACIÓN DE CUOTAS
router.get('/validar/marzo', cuotaCategoriaValidadorController.validateCuotasMarzo);
router.post('/validar/comparar-csv', cuotaCategoriaValidadorController.compareCuotasConCSV);

/**
 * DELETE /cuota-categoria/:id
 * Elimina una cuota de categoría por ID
 * 
 * Parámetros:
 * - id: ID de la cuota de categoría a eliminar
 * 
 * Ejemplo:
 * DELETE /cuota-categoria/123
 */
router.delete('/:id', cuotaCategoriaController.deleteById);

/**
 * DELETE /cuota-categoria/rango?fechaInicio=2026-05-01&fechaFin=2026-05-31
 * Elimina todas las cuotas de categoría en el rango de fechas especificado
 * 
 * Parámetros query:
 * - fechaInicio: Fecha de inicio (YYYY-MM-DD)
 * - fechaFin: Fecha de fin (YYYY-MM-DD)
 * 
 * Ejemplo:
 * DELETE /cuota-categoria/rango?fechaInicio=2026-05-01&fechaFin=2026-05-31
 */
router.delete('/rango/por-fechas', cuotaCategoriaController.deleteByDateRange);

module.exports = router;
