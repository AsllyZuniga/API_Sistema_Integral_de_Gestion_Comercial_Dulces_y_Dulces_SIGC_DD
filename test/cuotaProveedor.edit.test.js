require('dotenv').config();
const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../services/cuotaProveedorService');
const controller = require('../controllers/cuotaProveedorController');
const models = require('../models');

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

function toDateStr(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

test('cuotaProveedor edit - backend', async (t) => {
    const createdIds = [];

    async function createTestCuota(overrides = {}) {
        const row = await models.cuotaProveedor_model.create({
            cuota: 100000,
            fecha_inicio: '2026-03-01',
            fecha_fin: '2026-03-31',
            ...overrides
        });
        createdIds.push(row.id_cuotaProveedor);
        return row;
    }

    await t.test('service.updateById', async (st) => {
        await st.test('modifica cuota y conserva id y fechas', async () => {
            const row = await createTestCuota();

            const updated = await service.updateById(row.id_cuotaProveedor, { cuota: 250000.75 });

            assert.strictEqual(Number(updated.id_cuotaProveedor), Number(row.id_cuotaProveedor));
            assert.strictEqual(Number(updated.cuota), 250000.75);
            assert.strictEqual(toDateStr(updated.fecha_inicio), '2026-03-01');
            assert.strictEqual(toDateStr(updated.fecha_fin), '2026-03-31');
        });

        await st.test('modifica fechas manteniendo cuota', async () => {
            const row = await createTestCuota();

            const updated = await service.updateById(row.id_cuotaProveedor, {
                fecha_inicio: '2026-04-01',
                fecha_fin: '2026-04-30'
            });

            assert.strictEqual(Number(updated.id_cuotaProveedor), Number(row.id_cuotaProveedor));
            assert.strictEqual(Number(updated.cuota), 100000);
            assert.strictEqual(toDateStr(updated.fecha_inicio), '2026-04-01');
            assert.strictEqual(toDateStr(updated.fecha_fin), '2026-04-30');
        });

        await st.test('error 404 si la cuota no existe', async () => {
            await assert.rejects(
                async () => service.updateById(999999999, { cuota: 5000 }),
                (err) => err.statusCode === 404 && /no encontrada/.test(err.message)
            );
        });

        await st.test('error 400 si se intenta cambiar id_proveedor', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, { id_proveedor: 1 }),
                (err) => err.statusCode === 400 && /proveedor/.test(err.message)
            );
        });

        await st.test('error 400 con cuota negativa', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, { cuota: -10 }),
                (err) => err.statusCode === 400 && /negativa/.test(err.message)
            );
        });

        await st.test('error 400 con cuota no numérica', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, { cuota: 'abc' }),
                (err) => err.statusCode === 400 && /numérico/.test(err.message)
            );
        });

        await st.test('error 400 con fecha_inicio mayor que fecha_fin', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, {
                    fecha_inicio: '2026-05-10',
                    fecha_fin: '2026-05-01'
                }),
                (err) => err.statusCode === 400 && /mayor/.test(err.message)
            );
        });

        await st.test('error 400 con formato de fecha inválido', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, { fecha_inicio: '2026-02-30' }),
                (err) => err.statusCode === 400 && /fecha/.test(err.message)
            );
        });

        await st.test('error 400 si no hay campos para actualizar', async () => {
            const row = await createTestCuota();

            await assert.rejects(
                async () => service.updateById(row.id_cuotaProveedor, {}),
                (err) => err.statusCode === 400 && /No se recibieron/.test(err.message)
            );
        });

        await st.test('regresión: deleteById sigue funcionando después de editar', async () => {
            const row = await createTestCuota();
            await service.updateById(row.id_cuotaProveedor, { cuota: 999 });
            await service.deleteById(row.id_cuotaProveedor);
            createdIds.splice(createdIds.indexOf(row.id_cuotaProveedor), 1);

            const deleted = await models.cuotaProveedor_model.findByPk(row.id_cuotaProveedor);
            assert.strictEqual(deleted, null);
        });

        await st.test('regresión: create sigue funcionando', async () => {
            const created = await service.create({
                cuota: 55555,
                fecha_inicio: '2026-06-01',
                fecha_fin: '2026-06-30'
            });
            createdIds.push(created.id_cuotaProveedor);

            assert.strictEqual(Number(created.cuota), 55555);
            assert.strictEqual(toDateStr(created.fecha_inicio), '2026-06-01');
            assert.strictEqual(toDateStr(created.fecha_fin), '2026-06-30');
        });
    });

    await t.test('controller.updateById', async (st) => {
        await st.test('responde success true con datos actualizados', async () => {
            const row = await createTestCuota();
            const req = { params: { id: row.id_cuotaProveedor }, body: { cuota: 88888 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload.success, true);
            assert.strictEqual(res.payload.message, 'Cuota de proveedor actualizada correctamente');
            assert.strictEqual(Number(res.payload.data.cuota), 88888);
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
            const row = await createTestCuota();
            const req = { params: { id: row.id_cuotaProveedor }, body: { cuota: -5 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(/negativa/.test(res.payload.error));
        });

        await st.test('mapea cambio de proveedor a 400', async () => {
            const row = await createTestCuota();
            const req = { params: { id: row.id_cuotaProveedor }, body: { id_proveedor: 1 } };
            const res = createRes();

            await controller.updateById(req, res);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload.success, false);
            assert.ok(/proveedor/.test(res.payload.error));
        });
    });

    for (const id of createdIds) {
        try {
            await models.cuotaProveedor_model.destroy({ where: { id_cuotaProveedor: id } });
        } catch {}
    }
});
