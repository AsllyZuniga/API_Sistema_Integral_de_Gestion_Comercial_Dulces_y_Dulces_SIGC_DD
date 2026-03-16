const { vendedor_model, usuario_model, rol_model, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const normalizeText = (value) => String(value || '').trim();

const sanitizePassword = (value) => normalizeText(value);

const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(String(value || ''));

const buildVendedorPayload = (vendedor) => ({
    idVendedor: vendedor.id_vendedor,
    idUsuario: vendedor.id_usuario,
    codVendedor: normalizeText(vendedor.codigo_vendedor),
    codigo: normalizeText(vendedor.codigo_vendedor),
    nombre: normalizeText(vendedor.nombre),
    username: normalizeText(vendedor.usuario?.username),
    estado: vendedor.usuario?.estado,
    rol: vendedor.usuario?.rol
        ? {
            idRol: vendedor.usuario.rol.id_rol,
            nombre: normalizeText(vendedor.usuario.rol.nombre)
        }
        : null
});

const buildUsuarioPayload = (usuario) => ({
    idVendedor: null,
    idUsuario: usuario.id_usuario,
    codVendedor: null,
    codigo: null,
    nombre: normalizeText(usuario.username),
    username: normalizeText(usuario.username),
    estado: usuario.estado,
    rol: usuario.rol
        ? {
            idRol: usuario.rol.id_rol,
            nombre: normalizeText(usuario.rol.nombre)
        }
        : null
});

const login = async ({ codigo, username, password }) => {
    const codigoNormalizado = normalizeText(codigo);
    const usernameNormalizado = normalizeText(username);
    const passwordNormalizado = sanitizePassword(password);

    if ((!codigoNormalizado && !usernameNormalizado) || !passwordNormalizado) {
        return {
            success: false,
            status: 400,
            message: 'Código o username y contraseña son obligatorios'
        };
    }

    // Intento 1: buscar por vendedor vinculado a usuario (flujo normal para vendedores)
    const vendedor = await vendedor_model.findOne({
        where: codigoNormalizado
            ? { codigo_vendedor: codigoNormalizado }
            : undefined,
        include: [
            {
                model: usuario_model,
                as: 'usuario',
                where: usernameNormalizado ? { username: usernameNormalizado } : undefined,
                include: [
                    {
                        model: rol_model,
                        as: 'rol'
                    }
                ]
            }
        ]
    });

    if (vendedor?.usuario) {
        if (vendedor.usuario.estado === false) {
            return { success: false, status: 403, message: 'Usuario inactivo' };
        }

        const passwordGuardado = sanitizePassword(vendedor.usuario.password);
        let isValidPassword = false;

        if (isBcryptHash(passwordGuardado)) {
            isValidPassword = await bcrypt.compare(passwordNormalizado, passwordGuardado);
        } else {
            isValidPassword = passwordGuardado === passwordNormalizado;
            if (isValidPassword) {
                const passwordHasheado = await bcrypt.hash(passwordNormalizado, SALT_ROUNDS);
                await vendedor.usuario.update({ password: passwordHasheado });
            }
        }

        if (!isValidPassword) {
            return { success: false, status: 401, message: 'Código o contraseña no válidos' };
        }

        return {
            success: true,
            status: 200,
            data: {
                message: 'Autenticación exitosa',
                vendedor: buildVendedorPayload(vendedor)
            }
        };
    }

    // Intento 2: fallback para usuarios sin vendedor (admin, supervisor, etc.)
    if (!usernameNormalizado) {
        return { success: false, status: 401, message: 'Código o contraseña no válidos' };
    }

    const usuarioDirecto = await usuario_model.findOne({
        where: { username: usernameNormalizado },
        include: [{ model: rol_model, as: 'rol' }]
    });

    if (!usuarioDirecto) {
        return { success: false, status: 401, message: 'Código o contraseña no válidos' };
    }

    if (usuarioDirecto.estado === false) {
        return { success: false, status: 403, message: 'Usuario inactivo' };
    }

    const passwordGuardadoDirecto = sanitizePassword(usuarioDirecto.password);
    let isValidPasswordDirecto = false;

    if (isBcryptHash(passwordGuardadoDirecto)) {
        isValidPasswordDirecto = await bcrypt.compare(passwordNormalizado, passwordGuardadoDirecto);
    } else {
        isValidPasswordDirecto = passwordGuardadoDirecto === passwordNormalizado;
        if (isValidPasswordDirecto) {
            const passwordHasheado = await bcrypt.hash(passwordNormalizado, SALT_ROUNDS);
            await usuarioDirecto.update({ password: passwordHasheado });
        }
    }

    if (!isValidPasswordDirecto) {
        return { success: false, status: 401, message: 'Código o contraseña no válidos' };
    }

    return {
        success: true,
        status: 200,
        data: {
            message: 'Autenticación exitosa',
            vendedor: buildUsuarioPayload(usuarioDirecto)
        }
    };
};

const resolveRoleId = async (idRol) => {
    if (idRol) {
        const rol = await rol_model.findByPk(idRol);
        return rol ? rol.id_rol : null;
    }

    const rolVendedor = await rol_model.findOne({
        where: {
            nombre: {
                [Op.in]: ['Vendedor', 'VENDEDOR', 'vendedor']
            }
        }
    });

    if (rolVendedor) return rolVendedor.id_rol;

    const primerRol = await rol_model.findOne({
        order: [['id_rol', 'ASC']]
    });

    return primerRol ? primerRol.id_rol : null;
};

const register = async ({ codigo, username, password, id_rol, estado = true }) => {
    const codigoNormalizado = normalizeText(codigo);
    const usernameNormalizado = normalizeText(username);
    const passwordNormalizado = sanitizePassword(password);

    if (!usernameNormalizado || !passwordNormalizado) {
        return {
            success: false,
            status: 400,
            message: 'Username y contraseña son obligatorios'
        };
    }

    let vendedor = null;

    if (codigoNormalizado) {
        vendedor = await vendedor_model.findOne({
            where: {
                codigo_vendedor: codigoNormalizado
            },
            include: [
                {
                    model: usuario_model,
                    as: 'usuario',
                    include: [
                        {
                            model: rol_model,
                            as: 'rol'
                        }
                    ]
                }
            ]
        });

        if (!vendedor) {
            return {
                success: false,
                status: 404,
                message: 'No existe un vendedor con ese código'
            };
        }

        if (vendedor.id_usuario || vendedor.usuario) {
            return {
                success: false,
                status: 409,
                message: 'El vendedor ya tiene un usuario registrado'
            };
        }
    }

    if (!vendedor) {
        vendedor = await vendedor_model.findOne({
            where: {
                codigo_vendedor: usernameNormalizado,
                id_usuario: null
            }
        });
    }

    const existingUsername = await usuario_model.findOne({
        where: {
            username: usernameNormalizado
        }
    });

    if (existingUsername) {
        return {
            success: false,
            status: 409,
            message: 'El username ya está registrado'
        };
    }

    const roleId = await resolveRoleId(id_rol);

    if (!roleId) {
        return {
            success: false,
            status: 400,
            message: 'No se encontró un rol válido para registrar el usuario'
        };
    }

    const transaction = await sequelize.transaction();

    try {
        const passwordHasheado = await bcrypt.hash(passwordNormalizado, SALT_ROUNDS);

        const usuarioCreado = await usuario_model.create({
            username: usernameNormalizado,
            password: passwordHasheado,
            estado,
            id_rol: roleId
        }, { transaction });

        if (vendedor) {
            await vendedor.update({
                id_usuario: usuarioCreado.id_usuario
            }, { transaction });
        }

        await transaction.commit();

        let vendedorRegistrado = null;

        if (vendedor) {
            vendedorRegistrado = await vendedor_model.findByPk(vendedor.id_vendedor, {
                include: [
                    {
                        model: usuario_model,
                        as: 'usuario',
                        include: [
                            {
                                model: rol_model,
                                as: 'rol'
                            }
                        ]
                    }
                ]
            });
        }

        return {
            success: true,
            status: 201,
            data: {
                message: 'Usuario registrado correctamente',
                vendedor: vendedorRegistrado ? buildVendedorPayload(vendedorRegistrado) : null,
                usuario: {
                    idUsuario: usuarioCreado.id_usuario,
                    username: normalizeText(usuarioCreado.username),
                    estado: usuarioCreado.estado,
                    idRol: usuarioCreado.id_rol
                }
            }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const registerBulk = async (payload) => {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.usuarios)
            ? payload.usuarios
            : [];

    if (!rows.length) {
        return {
            success: false,
            status: 400,
            message: 'Debe enviar un arreglo de usuarios'
        };
    }

    const resultados = [];

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};
        try {
            const result = await register({
                codigo: row.codigo,
                username: row.username,
                password: row.password,
                id_rol: row.id_rol,
                estado: row.estado
            });

            if (result.success) {
                resultados.push({
                    index,
                    username: normalizeText(row.username),
                    status: 'creado',
                    idUsuario: result.data?.usuario?.idUsuario || null
                });
            } else {
                resultados.push({
                    index,
                    username: normalizeText(row.username),
                    status: 'error',
                    message: result.message
                });
            }
        } catch (error) {
            resultados.push({
                index,
                username: normalizeText(row.username),
                status: 'error',
                message: error.message || 'Error inesperado en registro masivo'
            });
        }
    }

    const creados = resultados.filter((item) => item.status === 'creado').length;
    const fallidos = resultados.length - creados;

    return {
        success: true,
        status: 200,
        data: {
            message: 'Registro masivo procesado',
            total: resultados.length,
            creados,
            fallidos,
            resultados
        }
    };
};

module.exports = {
    login,
    register,
    registerBulk
};
