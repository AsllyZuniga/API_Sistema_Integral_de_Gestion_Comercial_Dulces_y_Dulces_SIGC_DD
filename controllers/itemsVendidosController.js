'use strict';

const itemsVendidosService = require('../services/itemsVendidosService');

const ROLES_AUTORIZADOS = new Set(['1', '2', '3']);

// Códigos de error que el servicio puede devolver y que corresponden
// a un 400 Bad Request (input del cliente). Cualquier otro error del
// servicio baja como 403 para no filtrar detalles al cliente.
const CODIGOS_ERROR_400 = new Set([
    'FECHAS_REQUERIDAS',
    'FECHA_INVALIDA',
    'RANGO_FECHAS_INVALIDO',
    'VENDEDOR_NO_IDENTIFICADO',
    'SUPERVISOR_NO_IDENTIFICADO'
]);

module.exports = {
    async list(req, res) {
        try {
            // req.auth.rol puede llegar como número o string según el
            // flujo de autenticación; se normaliza a string para
            // comparaciones estrictas contra ROLES_AUTORIZADOS.
            const idRol = String(req.auth?.rol ?? req.auth?.idRol ?? '');

            if (!ROLES_AUTORIZADOS.has(idRol)) {
                return res.status(403).json({
                    success: false,
                    message: 'Rol no autorizado para este endpoint',
                    error: 'ROL_NO_AUTORIZADO'
                });
            }

            const fechaInicio = req.query.fechaInicio ? String(req.query.fechaInicio).trim() : null;
            const fechaFin = req.query.fechaFin ? String(req.query.fechaFin).trim() : null;

            const resultado = await itemsVendidosService.getItemsVendidosPorRol({
                fechaInicio,
                fechaFin,
                idRol,
                idUsuario: req.auth?.idUsuario,
                idVendedor: req.auth?.idVendedor
            });

            if (resultado?.error) {
                const statusCode = CODIGOS_ERROR_400.has(resultado.code) ? 400 : 403;
                return res.status(statusCode).json({
                    success: false,
                    message: resultado.error,
                    error: resultado.code
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado,
                message: 'Items vendidos obtenidos exitosamente'
            });
        } catch (error) {
            console.error('Error al obtener items vendidos:', error);
            if (error.sql) {
                console.error('SQL ejecutado:', error.sql);
            }
            return res.status(500).json({
                success: false,
                message: 'Error al obtener items vendidos',
                error: error.message
            });
        }
    }
};
