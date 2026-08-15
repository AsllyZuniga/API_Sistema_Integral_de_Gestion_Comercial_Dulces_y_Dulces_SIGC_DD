'use strict';

const express = require('express');
const router = express.Router();
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const ventasPorCanalController = require('../controllers/ventasPorCanalController');

/**
 * Middleware que exige JWT y permite solo Admin (rol 1) o Supervisor (rol 2).
 * Vendedor (rol 3) queda bloqueado por ahora, pendiente de autorización.
 */
const requireAdminOrSupervisor = [
    requireAuthJWT,
    (req, res, next) => {
        const idRol = req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol;
        if (String(idRol) !== '1' && String(idRol) !== '2') {
            return res.status(403).send({
                message: 'Acceso restringido a administradores y supervisores'
            });
        }
        return next();
    }
];

// RF-001 a RF-004: Admin y Supervisor habilitados. Vendedor requiere permiso aparte.
router.get('/', ...requireAdminOrSupervisor, ventasPorCanalController.general);

module.exports = router;
