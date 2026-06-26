const {
    vendedor_model,
    usuario_model,
    cuotaMes_model,
    cuotaSemana_model,
    cuotaDia_model
} = require('../models');

const SUPERVISOR_ROL_ID = 2;

const includeRelations = [
    { model: usuario_model, as: 'usuario' },
    { model: usuario_model, as: 'supervisor' },
    { model: cuotaMes_model, as: 'cuotaMes' },
    { model: cuotaSemana_model, as: 'cuotaSemana' },
    { model: cuotaDia_model, as: 'cuotaDia' }
];

/**
 * Lista todos los vendedores con sus relaciones (usuario, supervisor,
 * cuotas mes/semana/día). Sin paginación.
 *
 * @returns {Promise<Array>} arreglo de instancias del modelo vendedor.
 */
const getAll = async () => vendedor_model.findAll({ include: includeRelations });

/**
 * Obtiene un vendedor por su id con todas sus relaciones.
 *
 * @param {number|string} id id_vendedor
 * @returns {Promise<object|null>} instancia del modelo o null si no existe.
 */
const getById = async (id) => vendedor_model.findByPk(id, { include: includeRelations });

/**
 * Crea un nuevo vendedor.
 *
 * @param {object} data campos del modelo vendedor (codigo_vendedor,
 *   nombre, id_usuario, id_cuotaMes, id_cuotaSemana, id_cuotaDia).
 * @returns {Promise<object>} instancia creada.
 */
const create = async (data) => vendedor_model.create(data);

/**
 * Actualiza un vendedor existente. Devuelve null si no existe.
 *
 * @param {number|string} id id_vendedor
 * @param {object} data campos a actualizar
 * @returns {Promise<object|null>} instancia actualizada o null.
 */
const updateById = async (id, data) => {
    const vendedor = await vendedor_model.findByPk(id);
    if (!vendedor) return null;
    await vendedor.update(data);
    return vendedor;
};

/**
 * Asigna (o quita, si idSupervisor es null/undefined/'') un supervisor
 * a un vendedor. Acepta el idVendedor como id numérico o como
 * codigo_vendedor (string).
 *
 * Validaciones:
 *   - Si el vendedor no existe → { error: 'VENDEDOR_NOT_FOUND' }
 *   - Si se pasa supervisor y no existe → { error: 'SUPERVISOR_NOT_FOUND' }
 *   - Si el usuario no tiene rol de supervisor → { error: 'USUARIO_NOT_SUPERVISOR' }
 *
 * @param {number|string} idVendedor
 * @param {number|string|null|undefined} idSupervisor
 * @returns {Promise<{data: object} | {error: string}>}
 */
const assignSupervisor = async (idVendedor, idSupervisor) => {
    const identificador = String(idVendedor || '').trim();

    let vendedor = await vendedor_model.findByPk(identificador);
    if (!vendedor && identificador) {
        vendedor = await vendedor_model.findOne({
            where: { codigo_vendedor: identificador }
        });
    }

    if (!vendedor) {
        return { error: 'VENDEDOR_NOT_FOUND' };
    }

    if (idSupervisor === null || idSupervisor === undefined || idSupervisor === '') {
        await vendedor.update({ id_supervisor: null });
        return { data: await getById(vendedor.id_vendedor) };
    }

    const supervisor = await usuario_model.findByPk(idSupervisor);

    if (!supervisor) {
        return { error: 'SUPERVISOR_NOT_FOUND' };
    }

    if (Number(supervisor.id_rol) !== SUPERVISOR_ROL_ID) {
        return { error: 'USUARIO_NOT_SUPERVISOR' };
    }

    // Permitir cambiar el supervisor sin necesidad de quitarlo primero
    await vendedor.update({ id_supervisor: idSupervisor });
    return { data: await getById(vendedor.id_vendedor) };
};

const removeSupervisor = async (idVendedor) => assignSupervisor(idVendedor, null);

/**
 * Asignación masiva de un supervisor a varios vendedores en una sola
 * operación. Procesa cada vendedor de forma independiente, de modo
 * que un fallo individual no aborta el lote.
 *
 * @param {{id_supervisor: number|string, vendedores: Array<number|string>}} args
 * @returns {Promise<{data: {total: number, exitosos: number, fallidos: number,
 *   resultados: Array}} | {error: string, message: string}>}
 *   Si la lista de vendedores está vacía → EMPTY_VENDEDORES_LIST.
 */
const assignSupervisorBulk = async ({ id_supervisor, vendedores }) => {
    const listaVendedores = Array.isArray(vendedores) ? vendedores : [];

    if (!listaVendedores.length) {
        return {
            error: 'EMPTY_VENDEDORES_LIST',
            message: 'Debe enviar al menos un vendedor para asignar supervisor'
        };
    }

    const resultados = [];

    for (const vendedorRef of listaVendedores) {
        const resultado = await assignSupervisor(vendedorRef, id_supervisor);

        if (resultado?.error) {
            resultados.push({
                vendedor: String(vendedorRef || '').trim(),
                estado: 'error',
                error: resultado.error
            });
            continue;
        }

        resultados.push({
            vendedor: String(vendedorRef || '').trim(),
            estado: 'ok',
            id_vendedor: resultado.data?.id_vendedor || null,
            id_supervisor: resultado.data?.id_supervisor ?? id_supervisor
        });
    }

    const exitosos = resultados.filter((item) => item.estado === 'ok').length;
    const fallidos = resultados.length - exitosos;

    return {
        data: {
            total: resultados.length,
            exitosos,
            fallidos,
            resultados
        }
    };
};

/**
 * Devuelve todos los vendedores asignados a un supervisor, con sus
 * relaciones. `id_supervisor` corresponde a `usuario.id_usuario` del
 * supervisor (ver models/vendedor.js).
 *
 * @param {number} id_supervisor
 * @returns {Promise<Array>}
 */
const getBySupervisor = async (id_supervisor) => {
    return vendedor_model.findAll({
        where: { id_supervisor },
        include: includeRelations
    });
};

/**
 * Obtiene vendedores con clientes e items de forma optimizada.
 * Solo se pagina el nivel de VENDEDORES. Los clientes e items se devuelven completos.
 * @param {object} options - { vendedoresPage, vendedoresLimit, id_supervisor, id_vendedor, fechaInicio, fechaFin }
 */
const getVendedoresConClientesItems = async (options = {}) => {
    const {
        vendedoresPage = 1,
        vendedoresLimit = 10,
        id_supervisor = null,
        id_vendedor = null,
        fechaInicio = null,
        fechaFin = null,
        // Filtros adicionales del usuario (multi-selector del front).
        // Aceptan arrays (repetidos) o strings comma-separated.
        codVendedor = null,
        codProveedor = null,
        codCategoria = null,
        codCiudad = null
    } = options;

    const {
        Sequelize,
        cliente_model,
        venta_model,
        detalle_venta_model,
        item_model
    } = require('../models');

    const fechaWhere = {};

    if (fechaInicio && fechaFin) {
        fechaWhere.fecha = { [Sequelize.Op.between]: [fechaInicio, fechaFin] };
    } else if (fechaInicio) {
        fechaWhere.fecha = { [Sequelize.Op.gte]: fechaInicio };
    } else if (fechaFin) {
        fechaWhere.fecha = { [Sequelize.Op.lte]: fechaFin };
    }

    const offset = (vendedoresPage - 1) * vendedoresLimit;

    const whereVendedor = {};
    if (id_supervisor) whereVendedor.id_supervisor = id_supervisor;

    // 0. Si hay filtro de fechas, pre-calcular IDs de vendedores con ventas en el rango.
    // Esto excluye vendedores que NO tienen ninguna venta en el rango seleccionado.
    let idsVendedoresConVentas = null;
    if (fechaInicio || fechaFin) {
        const whereVentaPre = { ...fechaWhere };

        // Filtro por codigos de vendedor del usuario (multi)
        const toArr = (val) => {
            if (val == null || val === '') return [];
            const raw = Array.isArray(val) ? val : String(val).split(',');
            return raw.map((v) => String(v).trim()).filter(Boolean);
        };
        const vendedoresFiltro = toArr(codVendedor);
        if (vendedoresFiltro.length) {
            const Sequelize = require('sequelize');
            const { vendedor_model } = require('../models');
            const vs = await vendedor_model.findAll({
                attributes: ['id_vendedor'],
                where: { codigo_vendedor: { [Sequelize.Op.in]: vendedoresFiltro } },
                raw: true
            });
            const ids = vs.map(v => v.id_vendedor);
            if (id_vendedor) {
                if (!ids.includes(id_vendedor)) ids.length = 0;
                else ids.length = 1;
            }
            if (!ids.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            whereVentaPre.id_vendedor = { [Sequelize.Op.in]: ids };
        } else if (id_vendedor) {
            whereVentaPre.id_vendedor = id_vendedor;
        } else if (id_supervisor) {
            const equipo = await vendedor_model.findAll({
                attributes: ['id_vendedor'],
                where: { id_supervisor },
                raw: true
            });
            const ids = equipo.map(v => v.id_vendedor);
            if (!ids.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            whereVentaPre.id_vendedor = { [Sequelize.Op.in]: ids };
        }

        // Filtro por proveedor (reporta_prov_con_obs LIKE prefijo)
        const proveedoresFiltro = toArr(codProveedor);
        if (proveedoresFiltro.length) {
            const Sequelize = require('sequelize');
            const whereLike = { [Sequelize.Op.or]: proveedoresFiltro.map((p) => ({
                reporte_prov_con_obs: { [Sequelize.Op.like]: `${p}%` }
            })) };
            const dvModel = require('../models').detalle_venta_model;
            const dvs = await dvModel.findAll({
                attributes: ['id_venta'],
                where: { [Sequelize.Op.and]: [whereLike, { reporte_prov_con_obs: { [Sequelize.Op.ne]: null } }] },
                raw: true
            });
            const idsVenta = [...new Set(dvs.map(d => d.id_venta))];
            if (!idsVenta.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            whereVentaPre.id_venta = { [Sequelize.Op.in]: idsVenta };
        }

        // Filtro por categoria
        const categoriasFiltro = toArr(codCategoria);
        if (categoriasFiltro.length) {
            const Sequelize = require('sequelize');
            const itModel = require('../models').item_model;
            const items = await itModel.findAll({
                attributes: ['id_item'],
                where: { id_categoria: { [Sequelize.Op.in]: categoriasFiltro } },
                raw: true
            });
            const idsItem = items.map(i => i.id_item);
            if (!idsItem.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            const dvModel = require('../models').detalle_venta_model;
            const dvs = await dvModel.findAll({
                attributes: ['id_venta'],
                where: { id_item: { [Sequelize.Op.in]: idsItem } },
                raw: true
            });
            const idsVenta = [...new Set(dvs.map(d => d.id_venta))];
            if (!idsVenta.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            whereVentaPre.id_venta = whereVentaPre.id_venta
                ? { [Sequelize.Op.and]: [whereVentaPre.id_venta, { [Sequelize.Op.in]: idsVenta }] }
                : { [Sequelize.Op.in]: idsVenta };
        }

        // Filtro por ciudad (id_ciudad_original en detalle_venta)
        const ciudadesFiltro = toArr(codCiudad);
        if (ciudadesFiltro.length) {
            const Sequelize = require('sequelize');
            const dvModel = require('../models').detalle_venta_model;
            const dvs = await dvModel.findAll({
                attributes: ['id_venta'],
                where: { id_ciudad_original: { [Sequelize.Op.in]: ciudadesFiltro } },
                raw: true
            });
            const idsVenta = [...new Set(dvs.map(d => d.id_venta))];
            if (!idsVenta.length) {
                return {
                    vendedores: [],
                    paginacionVendedores: {
                        page: vendedoresPage,
                        limit: vendedoresLimit,
                        total: 0
                    }
                };
            }
            whereVentaPre.id_venta = whereVentaPre.id_venta
                ? { [Sequelize.Op.and]: [whereVentaPre.id_venta, { [Sequelize.Op.in]: idsVenta }] }
                : { [Sequelize.Op.in]: idsVenta };
        }

        const vendedoresConVentas = await venta_model.findAll({
            attributes: ['id_vendedor'],
            where: { ...whereVentaPre },
            group: ['id_vendedor'],
            raw: true
        });
        idsVendedoresConVentas = vendedoresConVentas.map(v => v.id_vendedor);

        if (!idsVendedoresConVentas.length) {
            return {
                vendedores: [],
                paginacionVendedores: {
                    page: vendedoresPage,
                    limit: vendedoresLimit,
                    total: 0
                }
            };
        }
    }

    // Combinar id_vendedor (filtro por token/rol) con el filtro de ventas en rango
    if (id_vendedor && idsVendedoresConVentas !== null) {
        // Intersección: el id_vendedor debe estar en la lista
        if (!idsVendedoresConVentas.includes(id_vendedor)) {
            return {
                vendedores: [],
                paginacionVendedores: {
                    page: vendedoresPage,
                    limit: vendedoresLimit,
                    total: 0
                }
            };
        }
        whereVendedor.id_vendedor = id_vendedor;
    } else if (id_vendedor) {
        whereVendedor.id_vendedor = id_vendedor;
    } else if (idsVendedoresConVentas !== null) {
        whereVendedor.id_vendedor = { [Sequelize.Op.in]: idsVendedoresConVentas };
    }

    // 1. Obtener vendedores paginados (sin las relaciones complejas aún)
    const { count: totalVendedores, rows: vendedores } = await vendedor_model.findAndCountAll({
        where: Object.keys(whereVendedor).length ? whereVendedor : undefined,
        offset,
        limit: vendedoresLimit,
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre'],
        order: [[Sequelize.fn('LOWER', Sequelize.col('nombre')), 'ASC']],
        distinct: true
    });

    const vendedoresConClientes = [];

    // 2. Para cada vendedor, obtener clientes únicos asociados (con paginación)
    for (const vendedor of vendedores) {
        // 2a. Obtener TODOS los clientes que tienen al menos una venta con este vendedor
        //     dentro del rango de fechas seleccionado (sin paginación)
        const clientesData = await cliente_model.findAll({
            attributes: [
                'id_cliente',
                'nro_documento',
                'razon_social'
            ],
            include: [
                {
                    model: venta_model,
                    as: 'ventas',
                    where: {
                        id_vendedor: vendedor.id_vendedor,
                        ...fechaWhere
                    },
                    attributes: [],
                    required: true
                }
            ],
            group: ['cliente_model.id_cliente'],
            subQuery: false,
            order: [[Sequelize.fn('LOWER', Sequelize.col('cliente_model.razon_social')), 'ASC']],
            raw: true,
            distinct: true
        });

        const totalClientes = clientesData.length;
        const clientesIds = clientesData.map((cliente) => cliente.id_cliente);

        // 2b. Calcular totalCompras por cliente dentro del rango de fechas
        const comprasMap = new Map();
        if (clientesIds.length) {
            const ventasEnRango = await venta_model.findAll({
                attributes: [
                    'id_cliente',
                    [Sequelize.fn('COUNT', Sequelize.col('id_venta')), 'totalCompras']
                ],
                where: {
                    id_vendedor: vendedor.id_vendedor,
                    id_cliente: { [Sequelize.Op.in]: clientesIds },
                    ...fechaWhere
                },
                group: ['id_cliente'],
                raw: true
            });
            ventasEnRango.forEach(v => {
                comprasMap.set(String(v.id_cliente), parseInt(v.totalCompras) || 0);
            });
        }

        // 2c. Obtener los items comprados en el rango de fechas
        let itemsAgrupados = [];

        if (clientesIds.length) {
            itemsAgrupados = await detalle_venta_model.findAll({
                attributes: [
                    [Sequelize.col('venta.id_cliente'), 'id_cliente'],
                    [Sequelize.col('item.id_item'), 'id_item'],
                    [Sequelize.col('item.descripcion'), 'descripcion'],
                    [Sequelize.col('item.codigo_item'), 'codigo_item'],
                    [Sequelize.fn('SUM', Sequelize.col('detalle_venta_model.cantidad')), 'cantidadTotal'],
                    [Sequelize.fn('COUNT', Sequelize.col('detalle_venta_model.id_detalle')), 'veces'],
                    [Sequelize.fn('AVG', Sequelize.col('detalle_venta_model.precio_unitario')), 'precio_unitario'],
                    [Sequelize.fn('SUM', Sequelize.col('detalle_venta_model.subtotal')), 'subtotal']
                ],
                include: [
                    {
                        model: venta_model,
                        as: 'venta',
                        attributes: [],
                        required: true,
                        where: {
                            id_vendedor: vendedor.id_vendedor,
                            id_cliente: { [Sequelize.Op.in]: clientesIds },
                            ...fechaWhere
                        }
                    },
                    {
                        model: item_model,
                        as: 'item',
                        attributes: []
                    }
                ],
                group: [
                    'venta.id_cliente',
                    'item.id_item',
                    'item.descripcion',
                    'item.codigo_item'
                ],
                subQuery: false,
                raw: true
            });
        }

        const itemsPorCliente = new Map();

        for (const item of itemsAgrupados) {
            const idClienteKey = String(item.id_cliente);
            if (!itemsPorCliente.has(idClienteKey)) {
                itemsPorCliente.set(idClienteKey, []);
            }
            itemsPorCliente.get(idClienteKey).push({
                id_item: item.id_item,
                descripcion: item.descripcion,
                codigo_item: item.codigo_item,
                cantidadTotal: parseFloat(item.cantidadTotal || 0),
                veces: parseInt(item.veces),
                precio_unitario: parseFloat(item.precio_unitario || 0),
                subtotal: parseFloat(item.subtotal || 0)
            });
        }

        const clientesConItems = clientesData.map((cliente) => {
            const itemsCliente = itemsPorCliente.get(String(cliente.id_cliente)) || [];

            return {
                id_cliente: cliente.id_cliente,
                nro_documento: cliente.nro_documento,
                razon_social: cliente.razon_social,
                totalCompras: comprasMap.get(String(cliente.id_cliente)) || 0,
                items: itemsCliente,
                totalItems: itemsCliente.length
            };
        });

        vendedoresConClientes.push({
            id_vendedor: vendedor.id_vendedor,
            codigo_vendedor: vendedor.codigo_vendedor,
            nombre: vendedor.nombre,
            clientes: clientesConItems,
            totalClientes
        });
    }

    return {
        vendedores: vendedoresConClientes,
        paginacionVendedores: {
            page: vendedoresPage,
            limit: vendedoresLimit,
            total: totalVendedores
        }
    };
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    assignSupervisor,
    removeSupervisor,
    assignSupervisorBulk,
    getBySupervisor,
    getVendedoresConClientesItems
};
