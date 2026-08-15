'use strict';

const express = require('express');
const router = express.Router();
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const ventasPorCanalController = require('../controllers/ventasPorCanalController');

/**
 * Middleware que exige JWT y permite Admin (rol 1), Supervisor (rol 2) o Vendedor (rol 3).
 * Vendedor ve solo sus datos gracias al scope self en el servicio.
 */
const requireAdminOrSupervisor = [
    requireAuthJWT,
    (req, res, next) => {
        const idRol = req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol;
        if (String(idRol) !== '1' && String(idRol) !== '2' && String(idRol) !== '3') {
            return res.status(403).send({
                message: 'Acceso restringido a administradores, supervisores y vendedores'
            });
        }
        return next();
    }
];

// RF-001 a RF-004: Admin, Supervisor y Vendedor habilitados.
router.get('/', ...requireAdminOrSupervisor, ventasPorCanalController.general);

module.exports = router;
