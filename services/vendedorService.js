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
    const vendedor = await vendedor_model.findByPk(idVendedor);
    if (!vendedor) {
        return { error: 'VENDEDOR_NOT_FOUND' };
    }

    if (idSupervisor === null || idSupervisor === undefined || idSupervisor === '') {
        await vendedor.update({ id_supervisor: null });
        return { data: await getById(idVendedor) };
    }

    const supervisor = await usuario_model.findByPk(idSupervisor);

    if (!supervisor) {
        return { error: 'SUPERVISOR_NOT_FOUND' };
    }

    if (Number(supervisor.id_rol) !== SUPERVISOR_ROL_ID) {
        return { error: 'USUARIO_NOT_SUPERVISOR' };
    }

    await vendedor.update({ id_supervisor: idSupervisor });
    return { data: await getById(idVendedor) };
};

module.exports = {
    getAll,
    getById,
    create,
    updateById,
    assignSupervisor
};
