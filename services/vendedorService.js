const {
    vendedor_model,
    usuario_model,
    cuotaMes_model,
    cuotaSemana_model,
    cuotaDia_model,
    vendedorCuotaProveedor_model,
    proveedor_model,
    cuotaProveedor_model
} = require('../models');

const SUPERVISOR_ROL_ID = 2;

const includeRelations = [
    { model: usuario_model, as: 'usuario' },
    { model: usuario_model, as: 'supervisor' },
    { model: cuotaMes_model, as: 'cuotaMes' },
    { model: cuotaSemana_model, as: 'cuotaSemana' },
    { model: cuotaDia_model, as: 'cuotaDia' },
    {
        model: vendedorCuotaProveedor_model,
        as: 'cuotasProveedor',
        include: [
            { model: proveedor_model, as: 'proveedor' },
            { model: cuotaProveedor_model, as: 'cuotaProveedor' }
        ]
    }
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
        // Aceptan arrays (parámetros repetidos) o strings separados por coma.
        codVendedor = null,
        codProveedor = null,
        codCategoria = null,
        codCiudad = null
    } = options;

    const { sequelize, Sequelize } = require('../models');
    const { QueryTypes } = require('sequelize');

    const page = Math.max(parseInt(vendedoresPage, 10) || 1, 1);
    const limit = Math.max(Math.min(parseInt(vendedoresLimit, 10) || 10, 100), 1);
    const offset = (page - 1) * limit;

    const toArr = (val) => {
        if (val == null || val === '') return [];
        const raw = Array.isArray(val) ? val : String(val).split(',');
        const flat = raw
            .flatMap((v) => String(v).split(',').map((s) => s.trim()))
            .filter(Boolean);
        return [...new Set(flat)];
    };

    const replacements = {};
    const where = [];

    const addInCondition = (columnSql, values, prefix) => {
        const list = toArr(values);
        if (!list.length) return;
        const placeholders = list.map((_, i) => `:${prefix}${i}`).join(',');
        list.forEach((value, i) => {
            replacements[`${prefix}${i}`] = String(value).trim();
        });
        where.push(`${columnSql} IN (${placeholders})`);
    };

    if (fechaInicio && fechaFin) {
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
        where.push('v.fecha BETWEEN :fechaInicio AND :fechaFin');
    } else if (fechaInicio) {
        replacements.fechaInicio = fechaInicio;
        where.push('v.fecha >= :fechaInicio');
    } else if (fechaFin) {
        replacements.fechaFin = fechaFin;
        where.push('v.fecha <= :fechaFin');
    }

    // Scope por rol/token. Se cruza con los filtros del usuario; no los reemplaza.
    if (id_supervisor) {
        replacements.idSupervisorScope = id_supervisor;
        where.push('vd.id_supervisor = :idSupervisorScope');
    }

    if (id_vendedor) {
        replacements.idVendedorScope = id_vendedor;
        where.push('v.id_vendedor = :idVendedorScope');
    }

    // Filtros multi: OR dentro del mismo filtro mediante IN, AND entre filtros distintos.
    addInCondition('vd.codigo_vendedor', codVendedor, 'codVend');
    addInCondition('CAST(i.id_proveedor AS TEXT)', codProveedor, 'codProv');
    addInCondition('CAST(i.id_categoria AS TEXT)', codCategoria, 'codCat');
    addInCondition('CAST(dv.id_ciudad_original AS TEXT)', codCiudad, 'codCiu');

    const whereSql = where.length ? where.join(' AND ') : '1=1';

    const fromSql = `
        FROM vendedor vd
        INNER JOIN venta v ON v.id_vendedor = vd.id_vendedor
        INNER JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        INNER JOIN item i ON i.id_item = dv.id_item
    `;

    const countSql = `
        SELECT COUNT(*)::int AS total
        FROM (
            SELECT DISTINCT vd.id_vendedor
            ${fromSql}
            WHERE ${whereSql}
        ) vendedores_filtrados
    `;

    const countRows = await sequelize.query(countSql, {
        replacements,
        type: QueryTypes.SELECT
    });
    const totalVendedores = Number(countRows[0]?.total || 0);

    if (!totalVendedores) {
        return {
            vendedores: [],
            paginacionVendedores: { page, limit, total: 0 }
        };
    }

    const vendedoresSql = `
        SELECT DISTINCT
            vd.id_vendedor,
            TRIM(vd.codigo_vendedor) AS codigo_vendedor,
            TRIM(vd.nombre) AS nombre
        ${fromSql}
        WHERE ${whereSql}
        ORDER BY nombre ASC
        LIMIT :vendedoresLimit OFFSET :vendedoresOffset
    `;

    const vendedores = await sequelize.query(vendedoresSql, {
        replacements: {
            ...replacements,
            vendedoresLimit: limit,
            vendedoresOffset: offset
        },
        type: QueryTypes.SELECT
    });

    const idsVendedoresPagina = vendedores.map((v) => v.id_vendedor).filter((id) => id != null);

    if (!idsVendedoresPagina.length) {
        return {
            vendedores: [],
            paginacionVendedores: { page, limit, total: totalVendedores }
        };
    }

    const paginaPlaceholders = idsVendedoresPagina.map((_, i) => `:vendPagina${i}`).join(',');
    const replacementsPagina = { ...replacements };
    idsVendedoresPagina.forEach((id, i) => {
        replacementsPagina[`vendPagina${i}`] = id;
    });

    const wherePaginaSql = `${whereSql} AND v.id_vendedor IN (${paginaPlaceholders})`;

    const clientesSql = `
        SELECT
            v.id_vendedor,
            c.id_cliente,
            TRIM(c.nro_documento) AS nro_documento,
            TRIM(c.razon_social) AS razon_social,
            COUNT(DISTINCT v.id_venta)::int AS "totalCompras"
        FROM vendedor vd
        INNER JOIN venta v ON v.id_vendedor = vd.id_vendedor
        INNER JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        INNER JOIN item i ON i.id_item = dv.id_item
        INNER JOIN cliente c ON c.id_cliente = v.id_cliente
        WHERE ${wherePaginaSql}
        GROUP BY v.id_vendedor, c.id_cliente, c.nro_documento, c.razon_social
        ORDER BY v.id_vendedor, LOWER(TRIM(c.razon_social)) ASC
    `;

    const itemsSql = `
        SELECT
            v.id_vendedor,
            v.id_cliente,
            i.id_item,
            TRIM(i.descripcion) AS descripcion,
            TRIM(i.codigo_item) AS codigo_item,
            COALESCE(SUM(dv.cantidad), 0)::float AS "cantidadTotal",
            COUNT(dv.id_detalle)::int AS veces,
            COALESCE(AVG(dv.precio_unitario), 0)::float AS precio_unitario,
            COALESCE(SUM(dv.subtotal), 0)::float AS subtotal
        FROM vendedor vd
        INNER JOIN venta v ON v.id_vendedor = vd.id_vendedor
        INNER JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        INNER JOIN item i ON i.id_item = dv.id_item
        WHERE ${wherePaginaSql}
        GROUP BY v.id_vendedor, v.id_cliente, i.id_item, i.descripcion, i.codigo_item
        ORDER BY v.id_vendedor, v.id_cliente, LOWER(TRIM(i.descripcion)) ASC
    `;

    const [clientesRows, itemsRows] = await Promise.all([
        sequelize.query(clientesSql, {
            replacements: replacementsPagina,
            type: QueryTypes.SELECT
        }),
        sequelize.query(itemsSql, {
            replacements: replacementsPagina,
            type: QueryTypes.SELECT
        })
    ]);

    const itemsPorVendedorCliente = new Map();
    for (const item of itemsRows) {
        const key = `${item.id_vendedor}|||${item.id_cliente}`;
        if (!itemsPorVendedorCliente.has(key)) itemsPorVendedorCliente.set(key, []);
        itemsPorVendedorCliente.get(key).push({
            id_item: item.id_item,
            descripcion: item.descripcion,
            codigo_item: item.codigo_item,
            cantidadTotal: Number(item.cantidadTotal || 0),
            veces: Number(item.veces || 0),
            precio_unitario: Number(item.precio_unitario || 0),
            subtotal: Number(item.subtotal || 0)
        });
    }

    const clientesPorVendedor = new Map();
    for (const cliente of clientesRows) {
        const idVendedorKey = String(cliente.id_vendedor);
        const keyItems = `${cliente.id_vendedor}|||${cliente.id_cliente}`;
        const items = itemsPorVendedorCliente.get(keyItems) || [];
        if (!clientesPorVendedor.has(idVendedorKey)) clientesPorVendedor.set(idVendedorKey, []);
        clientesPorVendedor.get(idVendedorKey).push({
            id_cliente: cliente.id_cliente,
            nro_documento: cliente.nro_documento,
            razon_social: cliente.razon_social,
            totalCompras: Number(cliente.totalCompras || 0),
            items,
            totalItems: items.length
        });
    }

    const vendedoresConClientes = vendedores.map((vendedor) => {
        const clientes = clientesPorVendedor.get(String(vendedor.id_vendedor)) || [];
        return {
            id_vendedor: vendedor.id_vendedor,
            codigo_vendedor: vendedor.codigo_vendedor,
            nombre: vendedor.nombre,
            clientes,
            totalClientes: clientes.length
        };
    });

    return {
        vendedores: vendedoresConClientes,
        paginacionVendedores: {
            page,
            limit,
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
