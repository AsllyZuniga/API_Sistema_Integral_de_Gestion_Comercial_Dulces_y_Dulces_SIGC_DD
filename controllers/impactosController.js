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
    filtros.vendedor = toArr(q.vendedor || q.codVendedor);
    return filtros;
}

function setNoCacheHeaders(res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
}

async function handle(req, res, tipo) {
    try {
        const scope = await getVendedorScopeFromAuth(req.auth);
        const filtros = buildFiltros(req.query, scope);
        const data = await service.calcularImpactos(tipo, filtros, scope);
        setNoCacheHeaders(res);
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

async function diagnostico(req, res) {
    try {
        const scope = await getVendedorScopeFromAuth(req.auth);
        const params = {
            tipo: req.query.tipo || 'cliente',
            codigoVendedor: req.query.vendedor || req.query.codVendedor,
            dimCodigo: req.query.proveedor || req.query.categoria || req.query.dim,
            fechaInicio: req.query.fechaInicio || undefined,
            fechaFin: req.query.fechaFin || undefined,
            scope
        };
        const data = await service.diagnosticarImpactos(params);
        setNoCacheHeaders(res);
        return res.status(200).send(data);
    } catch (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
}

module.exports = { vendedores, proveedores, categorias, diagnostico };
