'use strict';

require('dotenv').config();

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
    sequelize,
    vendedorCuotaCategoria_model,
    usuario_model,
    vendedor_model,
    categoria_model,
    megacategoria_model,
    rol_model
} = require('../models');
const service = require('../services/vendedorCuotaCategoriaService');
const controller = require('../controllers/vendedorCuotaCategoriaController');

const cleanup = {
    asignaciones: [],
    categorias: [],
    megacategorias: [],
    vendedores: [],
    usuarios: []
};

function uniqueSuffix() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDateStr(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

async function createTestUsuario({ id_rol = 1, acceso_cuotas = true } = {}) {
    const suffix = uniqueSuffix();
    const username = `test_vcc_${suffix}`;
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
        codigo_vendedor: `VCC${suffix}`,
        nombre: `Test VCC ${suffix}`,
        id_usuario: usuario.id_usuario,
        ...overrides
    });
    cleanup.vendedores.push(vendedor);
    return vendedor;
}

async function createTestCategoria(overrides = {}) {
    const suffix = uniqueSuffix();
    const megacategoria = await megacategoria_model.create({
        nombre: `Mega Test VCC ${suffix}`
    });
    cleanup.megacategorias.push(megacategoria);

    const categoria = await categoria_model.create({
        nombre: `Categoria Test VCC ${suffix}`,
        id_megacategoria: megacategoria.id_megacategoria,
        ...overrides
    });
    cleanup.categorias.push(categoria);
    return categoria;
}

async function createAsignacion(vendedor, categoria, overrides = {}) {
    const asignacion = await vendedorCuotaCategoria_model.create({
        id_vendedor: vendedor.id_vendedor,
        id_categoria: categoria.id_categoria,
        cuota: 100000,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-31',
        ...overrides
    });
    cleanup.asignaciones.push(asignacion);
    return asignacion;
}

function createRes() {
    const res = { statusCode: 200 };
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (payload) => {
        res.payload = payload;
        return res;
    };
    return res;
}

describe('vendedorCuotaCategoria edit - backend', { concurrency: false }, () => {
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
        for (const asignacion of cleanup.asignaciones.splice(0)) {
            try { await asignacion.destroy(); } catch {}
        }
        for (const vendedor of cleanup.vendedores.splice(0)) {
            try { await vendedor.destroy(); } catch {}
        }
        for (const usuario of cleanup.usuarios.splice(0)) {
            try { await usuario.destroy(); } catch {}
        }
        for (const categoria of cleanup.categorias.splice(0)) {
            try { await categoria.destroy(); } catch {}
        }
        for (const megacategoria of cleanup.megacategorias.splice(0)) {
            try { await megacategoria.destroy(); } catch {}
        }
    });

    after(async () => {
        await sequelize.close();
    });

    describe('service.updateById', () => {
        it('modifica cuota y conserva id, vendedor, categoría y fechas', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria, {
                cuota: 100000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await service.updateById(asignacion.id, { cuota: 250000.5 });

            assert.strictEqual(updated.id, asignacion.id);
            assert.strictEqual(Number(updated.id_vendedor), vendedor.id_vendedor);
            assert.strictEqual(Number(updated.id_categoria), categoria.id_categoria);
            assert.strictEqual(Number(updated.cuota), 250000.5);
            assert.strictEqual(toDateStr(updated.fecha_inicio), '2026-03-01');
            assert.strictEqual(toDateStr(updated.fecha_fin), '2026-03-31');

            const fromDb = await vendedorCuotaCategoria_model.findByPk(asignacion.id);
            assert.strictEqual(Number(fromDb.cuota), 250000.5);
        });

        it('modifica fechas manteniendo vendedor, categoría y cuota', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria, {
                cuota: 100000,
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });

            const updated = await service.updateById(asignacion.id, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            assert.strictEqual(updated.id, asignacion.id);
            assert.strictEqual(Number(updated.id_vendedor), vendedor.id_vendedor);
            assert.strictEqual(Number(updated.id_categoria), categoria.id_categoria);
            assert.strictEqual(Number(updated.cuota), 100000);
            assert.strictEqual(toDateStr(updated.fecha_inicio), '2026-04-01');
            assert.strictEqual(toDateStr(updated.fecha_fin), '2026-04-30');
        });

        it('error 404 si la asignación no existe', async () => {
            await assert.rejects(
                async () => service.updateById(999999999, { cuota: 1 }),
                (err) => err.statusCode === 404 && err.message.includes('no encontrada')
            );
        });

        it('error 400 si se intenta cambiar id_vendedor', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, { id_vendedor: 99999 }),
                (err) => err.statusCode === 400 && err.message.includes('vendedor o la categoría')
            );
        });

        it('error 400 si se intenta cambiar id_categoria', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, { id_categoria: 99999 }),
                (err) => err.statusCode === 400 && err.message.includes('vendedor o la categoría')
            );
        });

        it('error 400 con cuota negativa', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, { cuota: -100 }),
                (err) => err.statusCode === 400 && err.message.includes('mayor o igual a 0')
            );
        });

        it('error 400 con cuota no numérica', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, { cuota: 'abc' }),
                (err) => err.statusCode === 400 && err.message.includes('mayor o igual a 0')
            );
        });

        it('error 400 con fecha_inicio mayor que fecha_fin', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, {
                    fecha_inicio: '2026-03-31',
                    fecha_fin: '2026-03-01'
                }),
                (err) => err.statusCode === 400 && err.message.includes('fecha_inicio no puede ser mayor')
            );
        });

        it('error 400 con formato de fecha inválido', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await assert.rejects(
                async () => service.updateById(asignacion.id, { fecha_inicio: '2026-03-99' }),
                (err) => err.statusCode === 400 && err.message.includes('YYYY-MM-DD')
            );
        });

        it('error 409 si el nuevo período coincide con otra asignación del mismo vendedor/categoría', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacionA = await createAsignacion(vendedor, categoria, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const asignacionB = await createAsignacion(vendedor, categoria, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            await assert.rejects(
                async () => service.updateById(asignacionB.id, {
                    fecha_inicio: '2026-03-01',
                    fecha_fin: '2026-03-31'
                }),
                (err) => err.statusCode === 409 && err.message.includes('Ya existe otra cuota')
            );
        });

        it('no afecta asignaciones de otros vendedores', async () => {
            const usuarioA = await createTestUsuario();
            const usuarioB = await createTestUsuario();
            const vendedorA = await createTestVendedor(usuarioA);
            const vendedorB = await createTestVendedor(usuarioB);
            const categoria = await createTestCategoria();
            const asignacionA = await createAsignacion(vendedorA, categoria, { cuota: 10000 });
            const asignacionB = await createAsignacion(vendedorB, categoria, { cuota: 20000 });

            await service.updateById(asignacionA.id, { cuota: 9999999 });

            const unchanged = await vendedorCuotaCategoria_model.findByPk(asignacionB.id);
            assert.strictEqual(Number(unchanged.cuota), 20000);
        });

        it('regresión: deleteById sigue funcionando después de editar', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);

            await service.updateById(asignacion.id, { cuota: 1111 });
            const deleted = await service.deleteById(asignacion.id);
            assert.ok(deleted);

            const fromDb = await vendedorCuotaCategoria_model.findByPk(asignacion.id);
            assert.strictEqual(fromDb, null);
        });

        it('regresión: create sigue funcionando', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const created = await vendedorCuotaCategoria_model.create({
                id_vendedor: vendedor.id_vendedor,
                id_categoria: categoria.id_categoria,
                cuota: 12345.67,
                fecha_inicio: '2026-05-01',
                fecha_fin: '2026-05-31'
            });
            cleanup.asignaciones.push(created);

            assert.strictEqual(Number(created.cuota), 12345.67);
            assert.strictEqual(Number(created.id_vendedor), vendedor.id_vendedor);
            assert.strictEqual(Number(created.id_categoria), categoria.id_categoria);
        });
    });

    describe('controller.updateById', () => {
        it('responde success true con datos actualizados', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);
            const req = { params: { id: asignacion.id }, body: { cuota: 7777 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload.success, true);
            assert.strictEqual(Number(res.payload.data.cuota), 7777);
            assert.strictEqual(res.payload.message, 'Cuota de categoría actualizada correctamente');
        });

        it('mapea not found a 404', async () => {
            const req = { params: { id: 999999999 }, body: { cuota: 1 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('no encontrada'));
        });

        it('mapea validación a 400', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            const asignacion = await createAsignacion(vendedor, categoria);
            const req = { params: { id: asignacion.id }, body: { cuota: -1 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('mayor o igual a 0'));
        });

        it('mapea duplicado a 409', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const categoria = await createTestCategoria();
            await createAsignacion(vendedor, categoria, {
                fecha_inicio: '2026-03-01',
                fecha_fin: '2026-03-31'
            });
            const asignacionB = await createAsignacion(vendedor, categoria, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });
            const req = {
                params: { id: asignacionB.id },
                body: { fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' }
            };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 409);
            assert.strictEqual(res.payload.success, false);
            assert.ok(res.payload.error.includes('Ya existe otra cuota'));
        });
    });
});
