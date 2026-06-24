const vendedorService = require('../services/vendedorService');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseFechaParam = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const normalizado = String(value).trim();
    if (!DATE_REGEX.test(normalizado)) return null;
    return normalizado;
};

const resolveFechaRange = (query) => {
    const fechaInicio = parseFechaParam(query.fechaInicio);
    const fechaFin = parseFechaParam(query.fechaFin);

    if ((query.fechaInicio && !fechaInicio) || (query.fechaFin && !fechaFin)) {
        return {
            error: 'Formato inválido de fecha. Use YYYY-MM-DD.',
            code: 'FECHA_INVALIDA'
        };
    }

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        return {
            error: 'El rango de fechas es inválido (fechaInicio mayor que fechaFin).',
            code: 'RANGO_FECHAS_INVALIDO'
        };
    }

    return { fechaInicio, fechaFin };
};

/**
 * GET /api/vendedor/supervisor/:id_supervisor
 *
 * Devuelve todos los vendedores asignados al supervisor cuyo
 * id_usuario es :id_supervisor. Responde 400 si el id no es un entero
 * positivo.
 */
module.exports = {
    async getBySupervisor(req, res) {
        try {
            const idSupervisor = Number(req.params.id_supervisor);
            if (!Number.isInteger(idSupervisor) || idSupervisor <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro id_supervisor debe ser un entero positivo',
                    error: 'ID_SUPERVISOR_INVALIDO'
                });
            }
            const data = await vendedorService.getBySupervisor(idSupervisor);
            return res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Error al obtener vendedores por supervisor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener vendedores',
                error: error.message
            });
        }
    },

    /**
     * Handler para la URL antigua /vendedor/supervisor/con-items-comprados.
     * Devuelve 410 Gone apuntando a la URL correcta.
     * Razón: a partir de v1.1.0, este endpoint se unificó en /vendedor/con-items-comprados
     * con detección de rol por token.
     */
    async deprecatedSupervisorConItems(req, res) {
        return res.status(410).json({
            success: false,
            message: 'Esta ruta está obsoleta. Use GET /api/vendedor/con-items-comprados (detecta el rol automáticamente por token).',
            error: 'ENDPOINT_OBSOLETO',
            urlCorrecta: '/api/vendedor/con-items-comprados',
            documentacion: 'Ver ENDPOINT_VENDEDOR_ITEMS.md v1.1.0+'
        });
    },
    /**
     * GET /api/vendedor
     * Lista todos los vendedores con sus relaciones.
     */
    async list(req, res) {
        try {
            const data = await vendedorService.getAll();
            return res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Error al listar vendedores:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener lista de vendedores',
                error: error.message
            });
        }
    },

    /**
     * GET /api/vendedor/:id
     * Devuelve un vendedor por id, o 404 si no existe.
     */
    async getById(req, res) {
        try {
            const data = await vendedorService.getById(req.params.id);
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendedor no encontrado'
                });
            }
            return res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Error al obtener vendedor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener vendedor',
                error: error.message
            });
        }
    },

    /**
     * POST /api/vendedor
     * Crea un nuevo vendedor. 400 si falta el nombre o hay violación
     * de unicidad / FK. 201 con el vendedor creado en éxito.
     */
    async add(req, res) {
        try {
            // Validación básica
            if (!req.body.nombre || req.body.nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre del vendedor es requerido',
                    error: 'NOMBRE_REQUERIDO'
                });
            }

            const created = await vendedorService.create({
                codigo_vendedor: req.body.codigo_vendedor?.trim() || null,
                nombre: req.body.nombre?.trim(),
                id_usuario: req.body.id_usuario || null,
                id_cuotaMes: req.body.id_cuotaMes || null,
                id_cuotaSemana: req.body.id_cuotaSemana || null,
                id_cuotaDia: req.body.id_cuotaDia || null
            });
            return res.status(201).json({
                success: true,
                data: created,
                message: 'Vendedor creado exitosamente'
            });
        } catch (error) {
            // Manejo específico de errores de Sequelize
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors?.[0]?.path || 'campo desconocido';
                const mensaje = field === 'codigo_vendedor' 
                    ? `El código de vendedor "${req.body.codigo_vendedor}" ya existe` 
                    : field === 'id_usuario'
                    ? 'Este usuario ya está asignado a otro vendedor'
                    : `Ya existe un registro con ese ${field}`;
                
                return res.status(400).json({
                    success: false,
                    message: mensaje,
                    error: 'UNIQUE_CONSTRAINT_VIOLATION',
                    field: field
                });
            }

            if (error.name === 'SequelizeValidationError') {
                const mensaje = error.errors?.map(e => e.message).join(', ') || error.message;
                return res.status(400).json({
                    success: false,
                    message: mensaje,
                    error: 'VALIDATION_ERROR'
                });
            }

            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'Uno de los IDs referenciados (usuario, cuota) no existe',
                    error: 'FOREIGN_KEY_ERROR',
                    detail: error.message
                });
            }

            console.error('Error al crear vendedor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno al crear vendedor',
                error: error.message || 'UNKNOWN_ERROR'
            });
        }
    },

    /**
     * PUT /api/vendedor/:id
     * Actualiza parcialmente un vendedor. 404 si no existe, 400 ante
     * violación de unicidad, 200 con el vendedor actualizado en éxito.
     */
    async update(req, res) {
        try {
            const existing = await vendedorService.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendedor no encontrado'
                });
            }

            const updated = await vendedorService.updateById(req.params.id, {
                codigo_vendedor: req.body.codigo_vendedor ?? existing.codigo_vendedor,
                nombre: req.body.nombre ?? existing.nombre,
                id_usuario: req.body.id_usuario ?? existing.id_usuario,
                id_cuotaMes: req.body.id_cuotaMes ?? existing.id_cuotaMes,
                id_cuotaSemana: req.body.id_cuotaSemana ?? existing.id_cuotaSemana,
                id_cuotaDia: req.body.id_cuotaDia ?? existing.id_cuotaDia
            });

            return res.status(200).json({
                success: true,
                data: updated,
                message: 'Vendedor actualizado exitosamente'
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors?.[0]?.path || 'campo desconocido';
                return res.status(400).json({
                    success: false,
                    message: `Ya existe un registro con ese ${field}`,
                    error: 'UNIQUE_CONSTRAINT_VIOLATION',
                    field: field
                });
            }

            console.error('Error al actualizar vendedor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar vendedor',
                error: error.message
            });
        }
    },

    /**
     * PUT /api/vendedor/:id/asignar-supervisor
     * Body: { id_supervisor: number | null }
     * Asigna (o quita si null) el supervisor del vendedor.
     */
    async assignSupervisor(req, res) {
        try {
            const resultado = await vendedorService.assignSupervisor(
                req.params.id,
                req.body.id_supervisor
            );

            if (resultado?.error === 'VENDEDOR_NOT_FOUND') {
                return res.status(404).json({ 
                    success: false,
                    message: 'Vendedor no encontrado' 
                });
            }

            if (resultado?.error === 'SUPERVISOR_NOT_FOUND') {
                return res.status(404).json({ 
                    success: false,
                    message: 'Supervisor no encontrado' 
                });
            }

            if (resultado?.error === 'USUARIO_NOT_SUPERVISOR') {
                return res.status(400).json({ 
                    success: false,
                    message: 'El usuario indicado no tiene rol de supervisor' 
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                message: 'Supervisor asignado exitosamente'
            });
        } catch (error) {
            console.error('Error al asignar supervisor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al asignar supervisor',
                error: error.message
            });
        }
    },

    /**
     * PUT /api/vendedor/asignar-supervisor-masivo
     * Body: { id_supervisor, vendedores: [...] }
     * Asigna masivamente un supervisor a varios vendedores.
     */
    async assignSupervisorBulk(req, res) {
        try {
            const resultado = await vendedorService.assignSupervisorBulk({
                id_supervisor: req.body.id_supervisor,
                vendedores: req.body.vendedores
            });

            if (resultado?.error === 'EMPTY_VENDEDORES_LIST') {
                return res.status(400).json({ 
                    success: false,
                    message: resultado.message 
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data || resultado,
                message: 'Asignación masiva de supervisores completada'
            });
        } catch (error) {
            console.error('Error al asignar supervisores masivamente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error en asignación masiva de supervisores',
                error: error.message
            });
        }
    },

    /**
     * PUT /api/vendedor/:id/quitar-supervisor
     * Quita el supervisor del vendedor indicado. 404 si no existe.
     */
    async removeSupervisor(req, res) {
        try {
            const resultado = await vendedorService.removeSupervisor(req.params.id);

            if (resultado?.error === 'VENDEDOR_NOT_FOUND') {
                return res.status(404).json({ 
                    success: false,
                    message: 'Vendedor no encontrado' 
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                message: 'Supervisor removido exitosamente'
            });
        } catch (error) {
            console.error('Error al remover supervisor:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al remover supervisor',
                error: error.message
            });
        }
    },

    /**
     * Obtiene vendedores con clientes e items.
     * Solo se pagina el nivel de VENDEDORES. Los clientes (de cada vendedor) e items (de cada cliente)
     * se devuelven completos, sin paginación.
     * El alcance de los datos depende del rol del token JWT:
     *   - Admin (rol=1): todos los vendedores
     *   - Supervisor (rol=2): solo vendedores asignados al supervisor (id_supervisor = idUsuario)
     *   - Vendedor (rol=3): solo el vendedor autenticado (id_vendedor = idVendedor)
     * GET /vendedor/con-items-comprados?vendedoresPage=1&vendedoresLimit=10
     */
    async getConClientesItems(req, res) {
        try {
            const { fechaInicio, fechaFin, error, code } = resolveFechaRange(req.query);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error,
                    error: code
                });
            }

            // Parsear parámetros de paginación (solo vendedores; clientes e items no se paginan)
            const vendedoresPage = Math.max(parseInt(req.query.vendedoresPage) || 1, 1);
            const vendedoresLimit = Math.max(Math.min(parseInt(req.query.vendedoresLimit) || 10, 100), 1);

            // Detección de rol desde el token y construcción de filtros
            const idRol = String(req.auth?.rol ?? req.auth?.idRol ?? req.auth?.rol?.idRol ?? '');
            const filtros = {};

            if (idRol === '1') {
                // Admin: sin filtro, ve todos los vendedores
            } else if (idRol === '2') {
                const idSupervisor = req.auth?.idUsuario;
                if (!idSupervisor) {
                    return res.status(400).json({
                        success: false,
                        message: 'No se pudo identificar el supervisor en el token',
                        error: 'SUPERVISOR_NO_IDENTIFICADO'
                    });
                }
                filtros.id_supervisor = idSupervisor;
            } else if (idRol === '3') {
                const idVendedor = req.auth?.idVendedor;
                if (!idVendedor) {
                    return res.status(400).json({
                        success: false,
                        message: 'El token no contiene idVendedor',
                        error: 'VENDEDOR_NO_IDENTIFICADO'
                    });
                }
                filtros.id_vendedor = idVendedor;
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Rol no autorizado para este endpoint'
                });
            }

            const resultado = await vendedorService.getVendedoresConClientesItems({
                vendedoresPage,
                vendedoresLimit,
                ...filtros,
                fechaInicio,
                fechaFin
            });

            return res.status(200).json({
                success: true,
                data: resultado,
                message: 'Datos de vendedores, clientes e items obtenidos exitosamente'
            });
        } catch (error) {
            console.error('Error al obtener vendedores con clientes e items:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener vendedores con clientes e items',
                error: error.message
            });
        }
    }
};