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

const getAll = async () => vendedor_model.findAll({ include: includeRelations });

const getById = async (id) => vendedor_model.findByPk(id, { include: includeRelations });

const create = async (data) => vendedor_model.create(data);

const updateById = async (id, data) => {
    const vendedor = await vendedor_model.findByPk(id);
    if (!vendedor) return null;
    await vendedor.update(data);
    return vendedor;
};

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

const getBySupervisor = async (id_supervisor) => {
    return vendedor_model.findAll({
        where: { id_supervisor },
        include: includeRelations
    });
};

/**
 * Obtiene vendedores con clientes e items de forma optimizada
 * Soporta carga diferida (lazy loading) por nivel
 * @param {object} options - { vendedoresPage, vendedoresLimit, clientesPage, clientesLimit, itemsPage, itemsLimit }
 */
const getVendedoresConClientesItems = async (options = {}) => {
    const {
        vendedoresPage = 1,
        vendedoresLimit = 10,
        clientesPage = 1,
        clientesLimit = 5,
        itemsPage = 1,
        itemsLimit = 10
    } = options;

    const {
        Sequelize,
        cliente_model,
        venta_model,
        detalle_venta_model,
        item_model
    } = require('../models');

    const offset = (vendedoresPage - 1) * vendedoresLimit;

    // 1. Obtener vendedores paginados (sin las relaciones complejas aún)
    const { count: totalVendedores, rows: vendedores } = await vendedor_model.findAndCountAll({
        offset,
        limit: vendedoresLimit,
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });

    // 2. Para cada vendedor, obtener clientes únicos asociados (con paginación)
    const vendedoresConClientes = await Promise.all(
        vendedores.map(async (vendedor) => {
            // Obtener clientes únicos de este vendedor con sus ventas
            const { count: totalClientes, rows: clientesData } = await cliente_model.findAndCountAll({
                attributes: [
                    'id_cliente',
                    'nro_documento',
                    'razon_social',
                    [Sequelize.fn('COUNT', Sequelize.col('ventas.id_venta')), 'totalCompras']
                ],
                include: [
                    {
                        model: venta_model,
                        as: 'ventas',
                        where: { id_vendedor: vendedor.id_vendedor },
                        attributes: [],
                        required: true
                    }
                ],
                group: ['cliente_model.id_cliente'],
                subQuery: false,
                offset: (clientesPage - 1) * clientesLimit,
                limit: clientesLimit,
                raw: true
            });

            // 3. Para cada cliente, obtener los items comprados
            const clientesConItems = await Promise.all(
                clientesData.map(async (cliente) => {
                    const { count: totalItems, rows: itemsComprados } = await detalle_venta_model.findAndCountAll({
                        attributes: [
                            [Sequelize.col('item.id_item'), 'id_item'],
                            [Sequelize.col('item.descripcion'), 'descripcion'],
                            [Sequelize.col('item.codigo_item'), 'codigo_item'],
                            [Sequelize.fn('SUM', Sequelize.col('detalle_venta_model.cantidad')), 'cantidadTotal'],
                            [Sequelize.fn('COUNT', Sequelize.col('detalle_venta_model.id_detalle')), 'veces']
                        ],
                        include: [
                            {
                                model: venta_model,
                                as: 'venta',
                                attributes: [],
                                required: true,
                                where: {
                                    id_vendedor: vendedor.id_vendedor,
                                    id_cliente: cliente.id_cliente
                                }
                            },
                            {
                                model: item_model,
                                as: 'item',
                                attributes: []
                            }
                        ],
                        group: ['item.id_item', 'item.descripcion', 'item.codigo_item'],
                        subQuery: false,
                        offset: (itemsPage - 1) * itemsLimit,
                        limit: itemsLimit,
                        raw: true
                    });

                    return {
                        id_cliente: cliente.id_cliente,
                        nro_documento: cliente.nro_documento,
                        razon_social: cliente.razon_social,
                        totalCompras: parseInt(cliente.totalCompras),
                        items: itemsComprados.map(item => ({
                            id_item: item.id_item,
                            descripcion: item.descripcion,
                            codigo_item: item.codigo_item,
                            cantidadTotal: parseFloat(item.cantidadTotal || 0),
                            veces: parseInt(item.veces)
                        })),
                        paginacionItems: {
                            page: itemsPage,
                            limit: itemsLimit,
                            total: totalItems
                        }
                    };
                })
            );

            return {
                id_vendedor: vendedor.id_vendedor,
                codigo_vendedor: vendedor.codigo_vendedor,
                nombre: vendedor.nombre,
                clientes: clientesConItems,
                paginacionClientes: {
                    page: clientesPage,
                    limit: clientesLimit,
                    total: totalClientes
                }
            };
        })
    );

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
