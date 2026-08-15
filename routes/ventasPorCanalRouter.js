'use strict';

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/requireAdmin');
const ventasPorCanalController = require('../controllers/ventasPorCanalController');

// RF-001 a RF-004: etapa 1 solo ADMIN. Supervisor/Vendedor requieren permiso aparte.
router.get('/', ...requireAdmin, ventasPorCanalController.general);

module.exports = router;
