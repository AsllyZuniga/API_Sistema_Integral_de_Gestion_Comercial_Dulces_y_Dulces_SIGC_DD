require('dotenv').config();
const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../services/vendedorCuotaProveedorService');
const controller = require('../controllers/vendedorCuotaProveedorController');
const models = require('../models');

function uniqueSuffix() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

test('vendedorCuotaProveedor edit - backend', async (t) => {
    const cleanup = { usuarios: [], vendedores: [], proveedores: [], cuotas: [], asignaciones: [] };

    async function createTestUsuario() {
        const user = await models.usuario_model.create({
            username: `test_user_${uniqueSuffix()}`,
            password: 'testpass',
            id_rol: 2,
            acceso_ventas: true,
            acceso_cuotas: true,
            acceso_gestion_usuarios: false,
            acceso_reportes: true,
            acceso_importar: true,
            acceso_dashboard: true
        });
        cleanup.usuarios.push(user.id_usuario);
        return user;
    }

    async function createTestVendedor(usuario) {
        const vendedor = await models.vendedor_model.create({
            codigo_vendedor: `V${uniqueSuffix()}`,
            nombre: `Vendedor Test ${uniqueSuffix()}`,
            id_usuario: usuario.id_usuario
        });
        cleanup.vendedores.push(vendedor.id_vendedor);
        return vendedor;
    }

    async function createTestProveedor(nombre = null) {
        const proveedor = await models.proveedor_model.create({
            nombre: nombre || `Proveedor Test ${uniqueSuffix()}`,
            codigo: `P${uniqueSuffix()}`
        });
        cleanup.proveedores.push(proveedor.id_proveedor);
        return proveedor;
    }

    async function createTestCuotaProveedor(overrides = {}) {
        const cuota = await models.cuotaProveedor_model.create({
            cuota: 50000,
            fecha_inicio: '2026-05-01',
            fecha_fin: '2026-05-31',
            ...overrides
        });
        cleanup.cuotas.push(cuota.id_cuotaProveedor);
        return cuota;
    }

    async function createTestAsignacion(vendedor, proveedor, cuota, overrides = {}) {
            const asignacion = await models.vendedorCuotaProveedor_model.create({
            id_vendedor: vendedor.id_vendedor,
            id_proveedor: proveedor.id_proveedor,
            id_cuotaProveedor: cuota.id_cuotaProveedor,
            estado: true,
            ...overrides
        });
        cleanup.asignaciones.push(asignacion.id_vendedor_cuota_proveedor);
        return asignacion;
    }

    await t.test('service.updateById', async (st) => {
        await st.test('cambia el valor de la cuota de esa asignación sin afectar otras', async () => {
            const usuario1 = await createTestUsuario();
            const vendedor1 = await createTestVendedor(usuario1);
            const proveedor1 = await createTestProveedor();
            const cuota1 = await createTestCuotaProveedor({ cuota: 50000 });
            const asignacion1 = await createTestAsignacion(vendedor1, proveedor1, cuota1);

            const usuario2 = await createTestUsuario();
            const vendedor2 = await createTestVendedor(usuario2);
            const proveedor2 = await createTestProveedor();
            const cuota2 = await createTestCuotaProveedor({ cuota: 60000 });
            const asignacion2 = await createTestAsignacion(vendedor2, proveedor2, cuota2);

            const updated = await service.updateById(asignacion1.id_vendedor_cuota_proveedor, { cuota: 100000 });

            assert.strictEqual(Number(updated.id_vendedor_cuota_proveedor), Number(asignacion1.id_vendedor_cuota_proveedor));
            assert.strictEqual(Number(updated.id_vendedor), vendedor1.id_vendedor);
            assert.strictEqual(Number(updated.id_proveedor), Number(proveedor1.id_proveedor));
            assert.strictEqual(Number(updated.cuotaProveedor.cuota), 100000);

            const other = await models.cuotaProveedor_model.findByPk(cuota2.id_cuotaProveedor);
            assert.strictEqual(Number(other.cuota), 60000);
        });

        await st.test('conserva id_vendedor, id_proveedor, id_cuotaProveedor y estado', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor({ cuota: 75000 });
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            const updated = await service.updateById(asignacion.id_vendedor_cuota_proveedor, { cuota: 120000 });

            assert.strictEqual(Number(updated.id_vendedor), vendedor.id_vendedor);
            assert.strictEqual(Number(updated.id_proveedor), Number(proveedor.id_proveedor));
            assert.strictEqual(Number(updated.id_cuotaProveedor), Number(cuota.id_cuotaProveedor));
            assert.strictEqual(updated.estado, true);
        });

        await st.test('error 404 si la asignación no existe', async () => {
            await assert.rejects(
                async () => service.updateById(999999999, { cuota: 10000 }),
                (err) => err.statusCode === 404 && /no encontrada/.test(err.message)
            );
        });

        await st.test('error 400 si se intenta cambiar id_vendedor', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { id_vendedor: 1 }),
                (err) => err.statusCode === 400 && /id_vendedor/.test(err.message)
            );
        });

        await st.test('error 400 si se intenta cambiar id_proveedor', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { id_proveedor: 1 }),
                (err) => err.statusCode === 400 && /id_proveedor/.test(err.message)
            );
        });

        await st.test('error 400 si se intenta cambiar id_cuotaProveedor', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { id_cuotaProveedor: 1 }),
                (err) => err.statusCode === 400 && /id_cuotaProveedor/.test(err.message)
            );
        });

        await st.test('error 400 si se intenta cambiar fechas', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { fecha_inicio: '2026-06-01' }),
                (err) => err.statusCode === 400 && /fecha_inicio/.test(err.message)
            );
        });

        await st.test('error 400 con cuota negativa', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { cuota: -10 }),
                (err) => err.statusCode === 400 && /negativa/.test(err.message)
            );
        });

        await st.test('error 400 con cuota no numérica', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, { cuota: 'abc' }),
                (err) => err.statusCode === 400 && /numérico/.test(err.message)
            );
        });

        await st.test('error 400 si no hay campos para actualizar', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await assert.rejects(
                async () => service.updateById(asignacion.id_vendedor_cuota_proveedor, {}),
                (err) => err.statusCode === 400 && /No se recibieron/.test(err.message)
            );
        });

        await st.test('regresión: deleteById sigue funcionando después de editar', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            await service.updateById(asignacion.id_vendedor_cuota_proveedor, { cuota: 999 });
            await service.deleteById(asignacion.id_vendedor_cuota_proveedor);
            cleanup.asignaciones.splice(cleanup.asignaciones.indexOf(asignacion.id_vendedor_cuota_proveedor), 1);

            const deleted = await models.vendedorCuotaProveedor_model.findByPk(asignacion.id_vendedor_cuota_proveedor);
            assert.strictEqual(deleted, null);
        });

        await st.test('regresión: create sigue funcionando', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor({ cuota: 11111 });
            const created = await models.vendedorCuotaProveedor_model.create({
                id_vendedor: vendedor.id_vendedor,
                id_proveedor: proveedor.id_proveedor,
                id_cuotaProveedor: cuota.id_cuotaProveedor,
                estado: true
            });
            cleanup.asignaciones.push(created.id_vendedor_cuota_proveedor);

            assert.strictEqual(Number(created.id_vendedor), vendedor.id_vendedor);
            assert.strictEqual(Number(created.id_proveedor), Number(proveedor.id_proveedor));
            assert.strictEqual(Number(created.id_cuotaProveedor), Number(cuota.id_cuotaProveedor));
            assert.strictEqual(created.estado, true);
        });
    });

    await t.test('controller.updateById', async (st) => {
        await st.test('responde success true con cuota actualizada', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor({ cuota: 50000 });
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            const req = { params: { id: asignacion.id_vendedor_cuota_proveedor }, body: { cuota: 100000 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload.success, true);
            assert.strictEqual(res.payload.message, 'Cuota de proveedor actualizada correctamente');
            assert.strictEqual(Number(res.payload.data.cuotaProveedor.cuota), 100000);
        });

        await st.test('mapea not found a 404', async () => {
            const req = { params: { id: 999999999 }, body: { cuota: 1 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload.success, false);
            assert.ok(/no encontrada/.test(res.payload.error));
        });

        await st.test('mapea validación a 400', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            const req = { params: { id: asignacion.id_vendedor_cuota_proveedor }, body: { cuota: -5 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(/negativa/.test(res.payload.error));
        });

        await st.test('mapea falta de cuota a 400', async () => {
            const usuario = await createTestUsuario();
            const vendedor = await createTestVendedor(usuario);
            const proveedor = await createTestProveedor();
            const cuota = await createTestCuotaProveedor();
            const asignacion = await createTestAsignacion(vendedor, proveedor, cuota);

            const req = { params: { id: asignacion.id_vendedor_cuota_proveedor }, body: {} };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(/campo cuota/.test(res.payload.error));
        });
    });

    // Limpieza
    for (const id of cleanup.asignaciones) {
        try { await models.vendedorCuotaProveedor_model.destroy({ where: { id_vendedor_cuota_proveedor: id } }); } catch {}
    }
    for (const id of cleanup.cuotas) {
        try { await models.cuotaProveedor_model.destroy({ where: { id_cuotaProveedor: id } }); } catch {}
    }
    for (const id of cleanup.proveedores) {
        try { await models.proveedor_model.destroy({ where: { id_proveedor: id } }); } catch {}
    }
    for (const id of cleanup.vendedores) {
        try { await models.vendedor_model.destroy({ where: { id_vendedor: id } }); } catch {}
    }
    for (const id of cleanup.usuarios) {
        try { await models.usuario_model.destroy({ where: { id_usuario: id } }); } catch {}
    }
});
