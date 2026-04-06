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

    if (
        vendedor.id_supervisor &&
        Number(vendedor.id_supervisor) !== Number(idSupervisor)
    ) {
        return {
            error: 'VENDEDOR_ALREADY_ASSIGNED_TO_OTHER_SUPERVISOR',
            currentSupervisorId: vendedor.id_supervisor
        };
    }

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

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    assignSupervisor,
    removeSupervisor,
    assignSupervisorBulk,
    getBySupervisor
};
