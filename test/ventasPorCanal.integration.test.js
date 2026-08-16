'use strict';

require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../models');
const { getVentasPorCanal } = require('../services/ventasPorCanalService');

const PERIODO = { fechaInicio: '2026-08-01', fechaFin: '2026-08-15' };

const round = (value, decimals = 2) => {
	const factor = 10 ** decimals;
	return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

describe('Ventas por Canal - integración', () => {
	before(async () => {
		await sequelize.query('SELECT 1', { type: 'SELECT' });
	});

	after(async () => {
		await sequelize.close();
	});

	it('porcentajeCumplimiento coincide con part y la suma es ~100%', async () => {
		const data = await getVentasPorCanal(PERIODO, null);

		assert.ok(Array.isArray(data.detalle));
		assert.strictEqual(data.detalle.length > 0, true, 'debe haber canales con venta en el período');

		let suma = 0;
		data.detalle.forEach((row) => {
			assert.strictEqual(row.porcentajeCumplimiento, row.part);
			suma += row.porcentajeCumplimiento;
		});

		assert.ok(Math.abs(suma - 100) < 0.05, `suma de participaciones debe ser ~100, fue ${suma}`);
		assert.strictEqual(data.total.porcentajeCumplimiento, 100);
		assert.strictEqual(data.total.part, 100);
	});

	it('denominador respeta filtro de vendedor (total filtrado <= total general)', async () => {
		const general = await getVentasPorCanal(PERIODO, null);
		assert.ok(general.detalle.length > 0);

		const vendedorRow = await sequelize.query(`
			SELECT vd.codigo_vendedor
			FROM venta v
			JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
			WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin
			GROUP BY vd.codigo_vendedor
			ORDER BY SUM(v.valor_neto) DESC NULLS LAST
			LIMIT 1
		`, {
			replacements: PERIODO,
			type: 'SELECT',
			plain: true
		});

		if (!vendedorRow) {
			return;
		}

		const filtrado = await getVentasPorCanal({ ...PERIODO, vendedor: vendedorRow.codigo_vendedor }, null);
		assert.ok(filtrado.total.acumulado <= general.total.acumulado);

		let suma = 0;
		filtrado.detalle.forEach((row) => {
			assert.strictEqual(row.porcentajeCumplimiento, row.part);
			suma += row.porcentajeCumplimiento;
		});
		assert.ok(Math.abs(suma - 100) < 0.05, `suma filtrada por vendedor debe ser ~100, fue ${suma}`);
	});

	it('canal específico devuelve solo ese canal con 100% de participación', async () => {
		const general = await getVentasPorCanal(PERIODO, null);
		const canal = general.detalle[0];
		assert.ok(canal);

		const especifico = await getVentasPorCanal({ ...PERIODO, canal: String(canal.id_canal) }, null);
		assert.strictEqual(especifico.detalle.length, 1);
		assert.strictEqual(especifico.detalle[0].id_canal, canal.id_canal);
		assert.strictEqual(especifico.detalle[0].porcentajeCumplimiento, 100);
		assert.strictEqual(especifico.detalle[0].part, 100);
		assert.strictEqual(especifico.total.porcentajeCumplimiento, 100);
	});

	it('período sin ventas no produce NaN ni Infinity', async () => {
		const data = await getVentasPorCanal({ fechaInicio: '2000-01-01', fechaFin: '2000-01-01' }, null);
		assert.deepStrictEqual(data.detalle, []);
		assert.strictEqual(data.total.porcentajeCumplimiento, 0);
		assert.strictEqual(data.total.part, 0);
		assert.ok(!Number.isNaN(data.total.porcentajeCumplimiento));
		assert.ok(Number.isFinite(data.total.porcentajeCumplimiento));
	});
});
