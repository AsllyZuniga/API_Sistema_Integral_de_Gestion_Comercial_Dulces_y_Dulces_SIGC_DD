'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcularParticipacion } = require('../services/ventasPorCanalService');

describe('calcularParticipacion', () => {
	it('un canal con todo el total debe ser 100%', () => {
		assert.strictEqual(calcularParticipacion(100, 100), 100);
	});

	it('distribuye correctamente varios canales (40/30/30)', () => {
		const total = 100;
		assert.strictEqual(calcularParticipacion(40, total), 40);
		assert.strictEqual(calcularParticipacion(30, total), 30);
		assert.strictEqual(calcularParticipacion(30, total), 30);
	});

	it('con total cero retorna 0, sin NaN ni Infinity', () => {
		assert.strictEqual(calcularParticipacion(0, 0), 0);
		assert.strictEqual(calcularParticipacion(100, 0), 0);
		assert.ok(!Number.isNaN(calcularParticipacion(0, 0)));
		assert.ok(Number.isFinite(calcularParticipacion(100, 0)));
	});

	it('coherce strings y valores nulos a numero', () => {
		assert.strictEqual(calcularParticipacion('50', '100'), 50);
		assert.strictEqual(calcularParticipacion(null, 100), 0);
		assert.strictEqual(calcularParticipacion(100, undefined), 0);
	});
});
