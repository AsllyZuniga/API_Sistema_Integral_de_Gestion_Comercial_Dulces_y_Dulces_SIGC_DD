'use strict';

require('dotenv').config();

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
    sequelize,
    cuotaDia_model,
    usuario_model,
    vendedor_model,
    rol_model
} = require('../models');
const cuotaDiaService = require('../services/cuotaDiaService');
const cuotaDiaController = require('../controllers/cuotaDiaController');

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
    const username = `test_dia_${suffix}`;
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
        codigo_vendedor: `VD${suffix}`,
        nombre: `Test Vendedor Dia ${suffix}`,
        id_usuario: usuario.id_usuario,
        ...overrides
    });
    cleanup.vendedores.push(vendedor);
    return vendedor;
}

async function createCuotaDia(usuario, overrides = {}) {
    const cuota = await cuotaDia_model.create({
        cuota_dia: 50000,
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

describe('cuotaDia edit - backend', { concurrency: false }, () => {
    before(async () => {
        await rol_model.findOrCreate({
            where: { id_rol: 1 },
            defaults: { nombre: 'Administrador' }
        });
        await rol_model.findOrCreate({
            where: { id_rol: 3 },
            defaults: { nombre: 'Vendedor' }
        });

        await sequelize.query('SELECT 1', { type: 'SELECT' });
    });

    afterEach(async () => {
        for (const cuota of cleanup.cuotas.splice(0)) {
            try { await cuota.destroy(); } catch {}
        }
        for (const vendedor of cleanup.vendedores.splice(0)) {
            try { await vendedor.destroy(); } catch {}
        }
        for (const usuario of cleanup.usuarios.splice(0)) {
            try { await usuario.destroy(); } catch {}
        }
    });

    after(async () => {
        await sequelize.close();
    });

    describe('service.updateById', () => {
        it('modifica cuota_dia y conserva id, id_usuario y fechas', async () => {
            const usuario = await createTestUsuario();
            await createTestVendedor(usuario);
            const cuota = await createCuotaDia(usuario, {
                cuota_dia: 50000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await cuotaDiaService.updateById(cuota.id_cuotaDia, {
                cuota_dia: 75000
            });

            assert.strictEqual(updated.id_cuotaDia, cuota.id_cuotaDia);
            assert.strictEqual(Number(updated.id_usuario), usuario.id_usuario);
            assert.strictEqual(Number(updated.cuota_dia), 75000);
            assert.strictEqual(String(updated.fecha_inicio), '2026-03-01');
            assert.strictEqual(String(updated.fecha_fin), '2026-03-31');

            const fromDb = await cuotaDia_model.findByPk(cuota.id_cuotaDia);
            assert.strictEqual(Number(fromDb.cuota_dia), 75000);
        });

        it('modifica fechas manteniendo vendedor y valor', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario, {
                cuota_dia: 50000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await cuotaDiaService.updateById(cuota.id_cuotaDia, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            assert.strictEqual(updated.id_cuotaDia, cuota.id_cuotaDia);
            assert.strictEqual(Number(updated.id_usuario), usuario.id_usuario);
            assert.strictEqual(Number(updated.cuota_dia), 50000);
            assert.strictEqual(String(updated.fecha_inicio), '2026-04-01');
            assert.strictEqual(String(updated.fecha_fin), '2026-04-30');
        });

        it('error 404 si la cuota no existe', async () => {
            await assert.rejects(
                async () => cuotaDiaService.updateById(999999999, { cuota_dia: 1 }),
                (err) => err.statusCode === 404 && err.message.includes('no encontrada')
            );
        });

        it('error 400 si se intenta cambiar id_usuario', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuota.id_cuotaDia, { id_usuario: 99999 }),
                (err) => err.statusCode === 400 && err.message.includes('No se permite cambiar')
            );
        });

        it('error 400 con cuota_dia negativa', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuota.id_cuotaDia, { cuota_dia: -100 }),
                (err) => err.statusCode === 400 && err.message.includes('entero mayor o igual a 0')
            );
        });

        it('error 400 con cuota_dia no numérica', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuota.id_cuotaDia, { cuota_dia: 'abc' }),
                (err) => err.statusCode === 400 && err.message.includes('entero mayor o igual a 0')
            );
        });

        it('error 400 con fecha_inicio mayor que fecha_fin', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuota.id_cuotaDia, {
                    fecha_inicio: '2026-03-31',
                    fecha_fin: '2026-03-01'
                }),
                (err) => err.statusCode === 400 && err.message.includes('fecha_inicio no puede ser mayor')
            );
        });

        it('error 400 con formato de fecha inválido', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuota.id_cuotaDia, {
                    fecha_inicio: '2026-03-99'
                }),
                (err) => err.statusCode === 400 && err.message.includes('YYYY-MM-DD')
            );
        });

        it('error 409 si el nuevo período coincide con otra cuota del mismo usuario', async () => {
            const usuario = await createTestUsuario();
            const cuotaA = await createCuotaDia(usuario, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const cuotaB = await createCuotaDia(usuario, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            await assert.rejects(
                async () => cuotaDiaService.updateById(cuotaB.id_cuotaDia, {
                    fecha_inicio: '2026-03-01',
                    fecha_fin: '2026-03-31'
                }),
                (err) => err.statusCode === 409 && err.message.includes('Ya existe otra cuota')
            );
        });

        it('no afecta cuotas de otros vendedores', async () => {
            const usuarioA = await createTestUsuario();
            const usuarioB = await createTestUsuario();
            const cuotaA = await createCuotaDia(usuarioA, { cuota_dia: 10000 });
            const cuotaB = await createCuotaDia(usuarioB, { cuota_dia: 20000 });

            await cuotaDiaService.updateById(cuotaA.id_cuotaDia, { cuota_dia: 9999999 });

            const unchanged = await cuotaDia_model.findByPk(cuotaB.id_cuotaDia);
            assert.strictEqual(Number(unchanged.cuota_dia), 20000);
        });

        it('regresión: deleteById sigue funcionando después de editar', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);

            await cuotaDiaService.updateById(cuota.id_cuotaDia, { cuota_dia: 1111 });
            const deleted = await cuotaDiaService.deleteById(cuota.id_cuotaDia);
            assert.ok(deleted);

            const fromDb = await cuotaDia_model.findByPk(cuota.id_cuotaDia);
            assert.strictEqual(fromDb, null);
        });

        it('regresión: create sigue funcionando', async () => {
            const usuario = await createTestUsuario();
            const created = await cuotaDiaService.create({
                cuota_dia: 12345,
                fecha_inicio: '2026-05-01',
                fecha_fin: '2026-05-31',
                id_usuario: usuario.id_usuario
            });
            cleanup.cuotas.push(created);

            assert.strictEqual(Number(created.cuota_dia), 12345);
            assert.strictEqual(String(created.fecha_inicio), '2026-05-01');
            assert.strictEqual(Number(created.id_usuario), usuario.id_usuario);
        });
    });

    describe('controller.update', () => {
        it('responde success true con datos actualizados', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);
            const req = { params: { id: cuota.id_cuotaDia }, body: { cuota_dia: 7777 } };
            const res = createRes();

            await cuotaDiaController.update(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload.success, true);
            assert.strictEqual(Number(res.payload.data.cuota_dia), 7777);
            assert.strictEqual(res.payload.message, 'Cuota diaria actualizada correctamente');
        });

        it('mapea not found a 404', async () => {
            const req = { params: { id: 999999999 }, body: { cuota_dia: 1 } };
            const res = createRes();

            await cuotaDiaController.update(req, res);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('no encontrada'));
        });

        it('mapea validación a 400', async () => {
            const usuario = await createTestUsuario();
            const cuota = await createCuotaDia(usuario);
            const req = { params: { id: cuota.id_cuotaDia }, body: { cuota_dia: -1 } };
            const res = createRes();

            await cuotaDiaController.update(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('entero mayor o igual a 0'));
        });

        it('mapea duplicado a 409', async () => {
            const usuario = await createTestUsuario();
            await createCuotaDia(usuario, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const cuotaB = await createCuotaDia(usuario, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });
            const req = {
                params: { id: cuotaB.id_cuotaDia },
                body: { fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' }
            };
            const res = createRes();

            await cuotaDiaController.update(req, res);

            assert.strictEqual(res.statusCode, 409);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('Ya existe otra cuota'));
        });
    });
});
