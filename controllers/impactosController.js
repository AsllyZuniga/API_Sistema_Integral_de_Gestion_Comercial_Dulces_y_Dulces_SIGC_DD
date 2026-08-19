'use strict';

const service = require('../services/impactosService');
const { getVendedorScopeFromAuth } = require('../utils/scopeHelper');

function toArr(val) {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
    return [...new Set(flat)];
}

function buildFiltros(q, scope) {
    const filtros = {
        fechaInicio: q.fechaInicio || undefined,
        fechaFin: q.fechaFin || undefined,
        tipoPeriodo: toArr(q.tipoPeriodo || q.tipo_periodo),
        canal: toArr(q.canal || q.codCanal),
        ciudad: toArr(q.ciudad || q.codCiudad),
        proveedor: toArr(q.proveedor || q.codProveedor),
        categoria: toArr(q.categoria || q.codCategoria)
    };
    if (scope.tipo === 'all') {
        filtros.vendedor = toArr(q.vendedor || q.codVendedor);
    }
    return filtros;
}

async function handle(req, res, tipo) {
    try {
        const scope = await getVendedorScopeFromAuth(req.auth);
        const filtros = buildFiltros(req.query, scope);
        const data = await service.calcularImpactos(tipo, filtros, scope);
        return res.status(200).send(data);
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
}

async function vendedores(req, res) {
    return handle(req, res, 'vendedores');
}

async function proveedores(req, res) {
    return handle(req, res, 'proveedores');
}

async function categorias(req, res) {
    return handle(req, res, 'categorias');
}

module.exports = { vendedores, proveedores, categorias };
