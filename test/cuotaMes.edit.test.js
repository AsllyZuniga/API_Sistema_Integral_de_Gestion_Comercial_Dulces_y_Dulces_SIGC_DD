'use strict';

require('dotenv').config();

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
    sequelize,
    cuotaMes_model,
    usuario_model,
    vendedor_model,
    rol_model
} = require('../models');
const cuotaMesService = require('../services/cuotaMesService');
const cuotaMesController = require('../controllers/cuotaMesController');
const { requireAdminCuotas } = require('../middlewares/requireAdminCuotas');

const cleanup = {
    cuotas: [],
    vendedores: [],
    usuarios: []
};

function uniqueSuffix() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function createTestUsuario({ id_rol = 1, acceso_cuotas = true } = {}) {
    const suffix = uniqueSuffix();
    const username = `test_${suffix}`;
    const password = 'testpass';

    const usuario = await usuario_model.create({
        username,
        password,
        id_rol,
        acceso_cuotas,
        estado: true
    });
    cleanup.usuarios.push(usuario);
    return usuario;
}

async function createTestVendedor(usuario, overrides = {}) {
    const suffix = uniqueSuffix();
    const vendedor = await vendedor_model.create({
        codigo_vendedor: `V${suffix}`,
        nombre: `Test Vendedor ${suffix}`,
        id_usuario: usuario.id_usuario,
        ...overrides
    });
    cleanup.vendedores.push(vendedor);
    return vendedor;
}

async function createCuotaMes(usuario, overrides = {}) {
    const cuota = await cuotaMes_model.create({
        cuota_mes: 1000000,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-31',
        id_usuario: usuario.id_usuario,
        ...overrides
    });
    cleanup.cuotas.push(cuota);
    return cuota;
}

function createRes() {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.send = (payload) => {
        res.payload = payload;
        return res;
    };
    return res;
}

async function runGuard(req) {
    const guard = requireAdminCuotas[1];
    return new Promise((resolve) => {
        const res = {
            status(code) {
                res.statusCode = code;
                return res;
            },
            send(payload) {
                resolve({ calledNext: false, statusCode: res.statusCode, payload });
                return res;
            }
        };
        guard(req, res, () => resolve({ calledNext: true }));
    });
}

describe('cuotaMes edit - backend', { concurrency: false }, () => {
    before(async () => {
        // Asegurar roles necesarios para los tests de permisos
        await rol_model.findOrCreate({
            where: { id_rol: 1 },
            defaults: { nombre: 'Administrador' }
        });
        await rol_model.findOrCreate({
            where: { id_rol: 3 },
            defaults: { nombre: 'Vendedor' }
        });

        // Verificar conexión a BD
        await sequelize.query('SELECT 1', { type: 'SELECT' });
    });

    afterEach(async () => {
        for (const cuota of cleanup.cuotas.splice(0)) {
            try {
                await cuota.destroy();
            } catch {
                // puede ya no existir
            }
        }
        for (const vendedor of cleanup.vendedores.splice(0)) {
            try {
                await vendedor.destroy();
            } catch {
                // puede ya no existir
            }
        }
        for (const usuario of cleanup.usuarios.splice(0)) {
            try {
                await usuario.destroy();
            } catch {
                // puede ya no existir
            }
        }
    });

    after(async () => {
        await sequelize.close();
    });

    describe('service.updateById', () => {
        it('modifica cuota_mes y conserva id, id_usuario y fechas', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const cuota = await createCuotaMes(usuario, {
                cuota_mes: 1000000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await cuotaMesService.updateById(cuota.id_cuotaMes, {
                cuota_mes: 2500000
            });

            assert.strictEqual(updated.id_cuotaMes, cuota.id_cuotaMes);
            assert.strictEqual(Number(updated.id_usuario), usuario.id_usuario);
            assert.strictEqual(Number(updated.cuota_mes), 2500000);
            assert.strictEqual(String(updated.fecha_inicio), '2026-03-01');
            assert.strictEqual(String(updated.fecha_fin), '2026-03-31');

            const fromDb = await cuotaMes_model.findByPk(cuota.id_cuotaMes);
            assert.strictEqual(Number(fromDb.cuota_mes), 2500000);
        });

        it('modifica fechas manteniendo vendedor y valor', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario, {
                cuota_mes: 1000000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await cuotaMesService.updateById(cuota.id_cuotaMes, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            assert.strictEqual(updated.id_cuotaMes, cuota.id_cuotaMes);
            assert.strictEqual(Number(updated.id_usuario), usuario.id_usuario);
            assert.strictEqual(Number(updated.cuota_mes), 1000000);
            assert.strictEqual(String(updated.fecha_inicio), '2026-04-01');
            assert.strictEqual(String(updated.fecha_fin), '2026-04-30');
        });

        it('regenera fechas con mes y year', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario, {
                cuota_mes: 1000000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await cuotaMesService.updateById(cuota.id_cuotaMes, {
                mes: 5,
                year: 2027,
                cuota_mes: 3000000
            });

            assert.strictEqual(Number(updated.cuota_mes), 3000000);
            assert.strictEqual(String(updated.fecha_inicio), '2027-06-01');
            assert.strictEqual(String(updated.fecha_fin), '2027-06-30');
        });

        it('error 404 si la cuota no existe', async () => {
            await assert.rejects(
                async () => cuotaMesService.updateById(999999999, { cuota_mes: 1 }),
                (err) => err.statusCode === 404 && err.message.includes('no encontrada')
            );
        });

        it('error 400 si se intenta cambiar id_usuario', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await assert.rejects(
                async () => cuotaMesService.updateById(cuota.id_cuotaMes, { id_usuario: 99999 }),
                (err) => err.statusCode === 400 && err.message.includes('No se permite cambiar')
            );
        });

        it('error 400 con cuota_mes negativa', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await assert.rejects(
                async () => cuotaMesService.updateById(cuota.id_cuotaMes, { cuota_mes: -100 }),
                (err) => err.statusCode === 400 && err.message.includes('entero mayor o igual a 0')
            );
        });

        it('error 400 con cuota_mes no numérica', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await assert.rejects(
                async () => cuotaMesService.updateById(cuota.id_cuotaMes, { cuota_mes: 'abc' }),
                (err) => err.statusCode === 400 && err.message.includes('entero mayor o igual a 0')
            );
        });

        it('error 400 con fecha_inicio mayor que fecha_fin', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await assert.rejects(
                async () => cuotaMesService.updateById(cuota.id_cuotaMes, {
                    fecha_inicio: '2026-03-31',
                    fecha_fin: '2026-03-01'
                }),
                (err) => err.statusCode === 400 && err.message.includes('fecha_inicio no puede ser mayor')
            );
        });

        it('error 400 con formato de fecha inválido', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await assert.rejects(
                async () => cuotaMesService.updateById(cuota.id_cuotaMes, {
                    fecha_inicio: '2026-03-99'
                }),
                (err) => err.statusCode === 400 && err.message.includes('YYYY-MM-DD')
            );
        });

        it('error 409 si el nuevo período coincide con otra cuota del mismo usuario', async () => {
            const usuario = await createTestUsuario();
            const cuotaA = await createCuotaMes(usuario, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const cuotaB = await createCuotaMes(usuario, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            await assert.rejects(
                async () => cuotaMesService.updateById(cuotaB.id_cuotaMes, {
                    fecha_inicio: '2026-03-01',
                    fecha_fin: '2026-03-31'
                }),
                (err) => err.statusCode === 409 && err.message.includes('Ya existe otra cuota')
            );
        });

        it('no afecta cuotas de otros vendedores', async () => {
            const usuarioA = await createTestUsuario();
            const usuarioB = await createTestUsuario();
            const cuotaA = await createCuotaMes(usuarioA, { cuota_mes: 1000000 });
            const cuotaB = await createCuotaMes(usuarioB, { cuota_mes: 2000000 });

            await cuotaMesService.updateById(cuotaA.id_cuotaMes, { cuota_mes: 9999999 });

            const unchanged = await cuotaMes_model.findByPk(cuotaB.id_cuotaMes);
            assert.strictEqual(Number(unchanged.cuota_mes), 2000000);
        });

        it('regresión: deleteById sigue funcionando después de editar', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);

            await cuotaMesService.updateById(cuota.id_cuotaMes, { cuota_mes: 5555 });
            const deleted = await cuotaMesService.deleteById(cuota.id_cuotaMes);
            assert.ok(deleted);

            const fromDb = await cuotaMes_model.findByPk(cuota.id_cuotaMes);
            assert.strictEqual(fromDb, null);
        });

        it('regresión: create sigue funcionando', async () => {
            const usuario = await createTestUsuario();
            const created = await cuotaMesService.create({
                cuota_mes: 12345,
                fecha_inicio: '2026-05-01',
                fecha_fin: '2026-05-31',
                id_usuario: usuario.id_usuario
            });
            cleanup.cuotas.push(created);

            assert.strictEqual(Number(created.cuota_mes), 12345);
            assert.strictEqual(String(created.fecha_inicio), '2026-05-01');
            assert.strictEqual(Number(created.id_usuario), usuario.id_usuario);
        });
    });

    describe('controller.update', () => {
        it('responde success true con datos actualizados', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);
            const req = { params: { id: cuota.id_cuotaMes }, body: { cuota_mes: 7777 } };
            const res = createRes();

            await cuotaMesController.update(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload.success, true);
            assert.strictEqual(Number(res.payload.data.cuota_mes), 7777);
            assert.strictEqual(res.payload.message, 'Cuota mensual actualizada correctamente');
        });

        it('mapea not found a 404', async () => {
            const req = { params: { id: 999999999 }, body: { cuota_mes: 1 } };
            const res = createRes();

            await cuotaMesController.update(req, res);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('no encontrada'));
        });

        it('mapea validación a 400', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaMes(usuario);
            const req = { params: { id: cuota.id_cuotaMes }, body: { cuota_mes: -1 } };
            const res = createRes();

            await cuotaMesController.update(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('entero mayor o igual a 0'));
        });

        it('mapea duplicado a 409', async () => {
            const usuario = await createTestUsuario();
            await createCuotaMes(usuario, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const cuotaB = await createCuotaMes(usuario, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });
            const req = {
                params: { id: cuotaB.id_cuotaMes },
                body: { fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' }
            };
            const res = createRes();

            await cuotaMesController.update(req, res);

            assert.strictEqual(res.statusCode, 409);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('Ya existe otra cuota'));
        });
    });

    describe('middleware requireAdminCuotas', () => {
        it('permite admin con acceso a cuotas', async () => {
            const result = await runGuard({ auth: { rol: 1, accesoCuotas: true } });
            assert.strictEqual(result.calledNext, true);
        });

        it('bloquea admin sin acceso a cuotas', async () => {
            const result = await runGuard({ auth: { rol: 1, accesoCuotas: false } });
            assert.strictEqual(result.calledNext, false);
            assert.strictEqual(result.statusCode, 403);
            assert.ok(result.payload.success === false);
            assert.ok(result.payload.message.includes('gestión de cuotas'));
        });

        it('bloquea no-admin aunque tenga acceso a cuotas', async () => {
            const result = await runGuard({ auth: { rol: 3, accesoCuotas: true } });
            assert.strictEqual(result.calledNext, false);
            assert.strictEqual(result.statusCode, 403);
            assert.ok(result.payload.message.includes('administradores'));
        });
    });
});
