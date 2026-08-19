'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const TIPOS = {
    vendedores: { cuotaTable: 'impactos_cliente', displayKey: 'vendedor' },
    proveedores: { cuotaTable: 'impactos_proveedor', displayKey: 'proveedor' },
    categorias: { cuotaTable: 'impactos_categoria', displayKey: 'categoria' }
};

function toArr(val) {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
    return [...new Set(flat)];
}

function padCode(value) {
    const s = String(value ?? '').trim();
    if (/^\d+$/.test(s)) return s.padStart(4, '0');
    return s;
}

function extractCategoryName(dbNombre) {
    const raw = String(dbNombre ?? '').trim();
    const match = raw.match(/(?:\d+\s*-\s*)?(?:\d+\s*-)?\s*(.+)$/);
    if (match && match[1]) return match[1].trim();
    return raw;
}

function buildScopeCond(scope, column, replacements, prefix) {
    if (!scope || scope.tipo === 'all') return '';
    if (scope.tipo === 'team') {
        if (!scope.idsVendedor || scope.idsVendedor.length === 0) return `${column} = -1`;
        const placeholders = scope.idsVendedor.map((_, i) => `:${prefix}${i}`).join(',');
        scope.idsVendedor.forEach((id, i) => { replacements[`${prefix}${i}`] = id; });
        return `${column} IN (${placeholders})`;
    }
    if (scope.tipo === 'self') {
        if (!scope.idVendedor) return `${column} = -1`;
        replacements[`${prefix}0`] = scope.idVendedor;
        return `${column} = :${prefix}0`;
    }
    return '';
}

async function resolverVendedoresPorCanalCiudad(filtros) {
    const canales = toArr(filtros.canal);
    const ciudades = toArr(filtros.ciudad);

    if (!canales.length && !ciudades.length) return null;

    const replacements = {};
    const conds = [];

    if (canales.length) {
        conds.push('CAST(ca.id_canal AS TEXT) IN (:canales)');
        replacements.canales = canales;
    }
    if (ciudades.length) {
        conds.push('CAST(dv.id_ciudad_original AS TEXT) IN (:ciudades)');
        replacements.ciudades = ciudades;
    }

    const sql = `
        SELECT DISTINCT v.id_vendedor
        FROM venta v
        LEFT JOIN canal ca ON ca.id_canal = v.id_canal
        LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        WHERE ${conds.join(' AND ')}
    `;

    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return rows.map(r => r.id_vendedor);
}

async function resolverVendedoresPorCodigo(codigos) {
    const list = toArr(codigos);
    if (!list.length) return [];

    const expanded = new Set();
    list.forEach(c => {
        const raw = String(c ?? '').trim();
        expanded.add(raw);
        if (/^\d+$/.test(raw)) {
            expanded.add(String(Number(raw)));
            expanded.add(String(Number(raw)).padStart(4, '0'));
        }
    });

    const rows = await sequelize.query(
        'SELECT id_vendedor FROM vendedor WHERE codigo_vendedor IN (:codigos)',
        { replacements: { codigos: [...expanded] }, type: QueryTypes.SELECT }
    );
    return rows.map(r => r.id_vendedor);
}

function buildCondCanalCiudad(idsCanalCiudad, column, replacements, key) {
    if (!Array.isArray(idsCanalCiudad)) return '';
    if (idsCanalCiudad.length) {
        replacements[key] = idsCanalCiudad;
        return `${column} IN (:${key})`;
    }
    return `${column} = -1`;
}

function formatRow(cuota, impactos) {
    const c = Number(cuota) || 0;
    const i = Number(impactos) || 0;
    return {
        cuotaImpactos: c,
        impactos: i,
        porcCump: c > 0 ? Math.round((i / c) * 1000) / 10 : 0,
        faltan: Math.max(c - i, 0)
    };
}

function buildVentaValidaConds(prefix = 'v') {
    return [
        `${prefix}.valor_neto > 0`,
        `UPPER(TRIM(${prefix}.numero_documento)) NOT LIKE 'NC%'`
    ];
}

async function obtenerPeriodosCuota({ cuotaTable, fechaInicio, fechaFin, tipoPeriodo, scope, idsCanalCiudad, filtros }) {
    const replacements = { fechaInicio, fechaFin, tipoPeriodo };
    const conds = [
        'cu.fecha_fin >= :fechaInicio',
        'cu.fecha_inicio <= :fechaFin',
        'cu.tipo_periodo IN (:tipoPeriodo)'
    ];

    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) conds.push(scopeCuota);

    const condCcCuota = buildCondCanalCiudad(idsCanalCiudad, 'cu.id_vendedor', replacements, 'ccCuota');
    if (condCcCuota) conds.push(condCcCuota);

    if (filtros && filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            conds.push('cu.id_vendedor IN (:vendFiltro)');
        } else {
            conds.push('cu.id_vendedor = -1');
        }
    }

    const sql = `
        SELECT
            cu.id_vendedor,
            cu.tipo_periodo,
            cu.fecha_inicio,
            cu.fecha_fin,
            SUM(cu.cuota)::numeric AS cuota_total
        FROM ${cuotaTable} cu
        WHERE ${conds.join(' AND ')}
        GROUP BY cu.id_vendedor, cu.tipo_periodo, cu.fecha_inicio, cu.fecha_fin
        ORDER BY cu.id_vendedor, cu.tipo_periodo, cu.fecha_inicio
    `;

    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

async function calcularImpactosVendedorPeriodo({ idVendedor, fechaInicio, fechaFin }) {
    const replacements = { idVendedor, fechaInicio, fechaFin };
    const conds = [
        ...buildVentaValidaConds('v'),
        'v.fecha >= :fechaInicio',
        'v.fecha <= :fechaFin',
        'v.id_vendedor = :idVendedor'
    ];

    const sql = `
        SELECT COUNT(DISTINCT v.id_cliente) AS impactos
        FROM venta v
        WHERE ${conds.join(' AND ')}
    `;

    const [row] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return Number(row?.impactos || 0);
}

async function obtenerPeriodosDimensionCuota({ cuotaTable, dimCol, fechaInicio, fechaFin, tipoPeriodo, scope, idsCanalCiudad, filtros }) {
    const replacements = { fechaInicio, fechaFin, tipoPeriodo };
    const conds = [
        'cu.fecha_fin >= :fechaInicio',
        'cu.fecha_inicio <= :fechaFin',
        'cu.tipo_periodo IN (:tipoPeriodo)'
    ];

    const scopeCuota = buildScopeCond(scope, 'cu.id_vendedor', replacements, 'cq');
    if (scopeCuota) conds.push(scopeCuota);

    const condCcCuota = buildCondCanalCiudad(idsCanalCiudad, 'cu.id_vendedor', replacements, 'ccCuota');
    if (condCcCuota) conds.push(condCcCuota);

    if (filtros && filtros.vendedor && toArr(filtros.vendedor).length) {
        const ids = await resolverVendedoresPorCodigo(filtros.vendedor);
        if (ids.length) {
            replacements.vendFiltro = ids;
            conds.push('cu.id_vendedor IN (:vendFiltro)');
        } else {
            conds.push('cu.id_vendedor = -1');
        }
    }

    const dimFilters = filtros ? (dimCol === 'id_proveedor' ? toArr(filtros.proveedor) : toArr(filtros.categoria)) : [];
    if (dimFilters.length) {
        replacements.dimFiltro = dimFilters;
        conds.push(`cu.${dimCol} IN (:dimFiltro)`);
    }

    const sql = `
        SELECT
            cu.id_vendedor,
            cu.${dimCol} AS id_dim,
            cu.tipo_periodo,
            cu.fecha_inicio,
            cu.fecha_fin,
            SUM(cu.cuota)::numeric AS cuota_total
        FROM ${cuotaTable} cu
        WHERE ${conds.join(' AND ')}
        GROUP BY cu.id_vendedor, cu.${dimCol}, cu.tipo_periodo, cu.fecha_inicio, cu.fecha_fin
        ORDER BY cu.id_vendedor, cu.${dimCol}, cu.tipo_periodo, cu.fecha_inicio
    `;

    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

async function calcularImpactosDimensionPeriodo({ dim, idVendedor, idDim, fechaInicio, fechaFin }) {
    const dimCol = dim === 'proveedor' ? 'id_proveedor' : 'id_categoria';
    const replacements = { idVendedor, idDim, fechaInicio, fechaFin };

    // Para categoría se deduplica por (proveedor + cliente), no solo por cliente.
    // Esto refleja que un mismo cliente comprando la misma categoría a proveedores
    // distintos genera un impacto por cada proveedor en la categoría.
    const countExpr = dim === 'categoria'
        ? "COUNT(DISTINCT CONCAT(i.id_proveedor::text, '-', v.id_cliente::text))"
        : 'COUNT(DISTINCT v.id_cliente)';

    const sql = `
        SELECT ${countExpr} AS impactos
        FROM venta v
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item i ON i.id_item = dv.id_item
        WHERE v.id_vendedor = :idVendedor
          AND i.${dimCol} = :idDim
          AND v.valor_neto > 0
          AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%'
          AND v.fecha >= :fechaInicio
          AND v.fecha <= :fechaFin
    `;

    const [row] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return Number(row?.impactos || 0);
}

async function calcularVendedores(ctx) {
    const { fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, scope, filtros } = ctx;

    const periodos = await obtenerPeriodosCuota({
        cuotaTable: TIPOS.vendedores.cuotaTable,
        fechaInicio,
        fechaFin,
        tipoPeriodo,
        scope,
        idsCanalCiudad,
        filtros
    });

    if (!periodos.length) {
        return { success: true, tipo: 'vendedores', total: 0, rows: [] };
    }

    const idsVendedor = [...new Set(periodos.map(p => p.id_vendedor))];
    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor IN (:ids)',
        { replacements: { ids: idsVendedor }, type: QueryTypes.SELECT }
    );
    const vendedorMap = new Map(vendedorRows.map(v => [v.id_vendedor, v]));

    const rows = [];
    for (const periodo of periodos) {
        const impactos = await calcularImpactosVendedorPeriodo({
            idVendedor: periodo.id_vendedor,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin
        });

        const v = vendedorMap.get(periodo.id_vendedor);
        const cuota = Number(periodo.cuota_total) || 0;

        rows.push({
            vendedor: v ? `${padCode(v.codigo_vendedor)} - ${v.nombre}` : `ID ${periodo.id_vendedor}`,
            tipoPeriodo: periodo.tipo_periodo,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin,
            ...formatRow(cuota, impactos)
        });
    }

    return { success: true, tipo: 'vendedores', total: rows.length, rows };
}

async function calcularDimension(ctx, dim) {
    const { cuotaTable, fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, scope, filtros } = ctx;
    const isProv = dim === 'proveedor';
    const dimTable = isProv ? 'proveedor' : 'categoria';
    const dimCol = isProv ? 'id_proveedor' : 'id_categoria';
    const dimKey = isProv ? 'proveedor' : 'categoria';

    const periodos = await obtenerPeriodosDimensionCuota({
        cuotaTable,
        dimCol,
        fechaInicio,
        fechaFin,
        tipoPeriodo,
        scope,
        idsCanalCiudad,
        filtros
    });

    if (!periodos.length) {
        return { success: true, tipo: isProv ? 'proveedores' : 'categorias', total: 0, rows: [] };
    }

    const idsVendedor = [...new Set(periodos.map(p => p.id_vendedor))];
    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor IN (:ids)',
        { replacements: { ids: idsVendedor }, type: QueryTypes.SELECT }
    );
    const vendedorMap = new Map(vendedorRows.map(v => [v.id_vendedor, v]));

    const idsDim = [...new Set(periodos.map(p => p.id_dim))];
    const dimRows = await sequelize.query(
        `SELECT ${dimCol} AS id_dim, nombre FROM ${dimTable} WHERE ${dimCol} IN (:ids)`,
        { replacements: { ids: idsDim }, type: QueryTypes.SELECT }
    );
    const dimMap = new Map(dimRows.map(d => [d.id_dim, d]));

    const rows = [];
    for (const periodo of periodos) {
        const impactos = await calcularImpactosDimensionPeriodo({
            dim,
            idVendedor: periodo.id_vendedor,
            idDim: periodo.id_dim,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin
        });

        const v = vendedorMap.get(periodo.id_vendedor);
        const d = dimMap.get(periodo.id_dim);
        const cuota = Number(periodo.cuota_total) || 0;

        rows.push({
            vendedor: v ? `${padCode(v.codigo_vendedor)} - ${v.nombre}` : `ID ${periodo.id_vendedor}`,
            [dimKey]: isProv ? d?.nombre : extractCategoryName(d?.nombre),
            tipoPeriodo: periodo.tipo_periodo,
            fechaInicio: periodo.fecha_inicio,
            fechaFin: periodo.fecha_fin,
            ...formatRow(cuota, impactos)
        });
    }

    return { success: true, tipo: isProv ? 'proveedores' : 'categorias', total: rows.length, rows };
}

async function resolverProveedorPorCodigo(codigo) {
    const rows = await sequelize.query(
        'SELECT id_proveedor FROM proveedor WHERE codigo = :cod OR nombre = :cod',
        { replacements: { cod: String(codigo ?? '').trim() }, type: QueryTypes.SELECT }
    );
    return rows.map(r => r.id_proveedor);
}

async function resolverCategoriaPorNombre(nombre) {
    const buscado = String(nombre ?? '').trim();
    if (!buscado) return [];

    // Primero intentar coincidencia exacta con el nombre completo de BD.
    const exact = await sequelize.query(
        'SELECT id_categoria FROM categoria WHERE nombre = :nom',
        { replacements: { nom: buscado }, type: QueryTypes.SELECT }
    );
    if (exact.length) return exact.map(r => r.id_categoria);

    // Si no, buscar comparando la parte descriptiva (sin el prefijo "XXXX - ").
    const all = await sequelize.query(
        'SELECT id_categoria, nombre FROM categoria',
        { type: QueryTypes.SELECT }
    );
    const matches = all.filter(c => extractCategoryName(c.nombre) === buscado);
    return matches.map(r => r.id_categoria);
}

async function diagnosticarImpactos({ tipo = 'cliente', codigoVendedor, dimCodigo, fechaInicio, fechaFin, scope }) {
    if (!codigoVendedor) throw new Error('codigoVendedor es requerido');
    if (!fechaInicio || !fechaFin) throw new Error('fechaInicio y fechaFin son requeridos');
    if (!['cliente', 'proveedor', 'categoria'].includes(tipo)) {
        throw new Error('tipo debe ser cliente, proveedor o categoria');
    }

    const idsVend = await resolverVendedoresPorCodigo(codigoVendedor);
    if (!idsVend.length) throw new Error(`Vendedor con código ${codigoVendedor} no encontrado`);

    let idVendedor = idsVend[0];

    if (scope && scope.tipo !== 'all') {
        const allowed = scope.tipo === 'self' ? [scope.idVendedor] : scope.idsVendedor;
        const intersection = idsVend.filter(id => allowed.includes(id));
        if (!intersection.length) {
            throw new Error('Vendedor fuera del alcance de su rol');
        }
        idVendedor = intersection[0];
    }

    let idDim = null;
    let dimInfo = null;
    if (tipo === 'proveedor') {
        if (!dimCodigo) throw new Error('dimCodigo es requerido para tipo=proveedor');
        const ids = await resolverProveedorPorCodigo(dimCodigo);
        if (!ids.length) throw new Error(`Proveedor ${dimCodigo} no encontrado`);
        idDim = ids[0];
        const [info] = await sequelize.query(
            'SELECT id_proveedor, codigo, nombre FROM proveedor WHERE id_proveedor = :id',
            { replacements: { id: idDim }, type: QueryTypes.SELECT }
        );
        dimInfo = info;
    } else if (tipo === 'categoria') {
        if (!dimCodigo) throw new Error('dimCodigo es requerido para tipo=categoria');
        const ids = await resolverCategoriaPorNombre(dimCodigo);
        if (!ids.length) throw new Error(`Categoría ${dimCodigo} no encontrada`);
        idDim = ids[0];
        const [info] = await sequelize.query(
            'SELECT id_categoria, nombre FROM categoria WHERE id_categoria = :id',
            { replacements: { id: idDim }, type: QueryTypes.SELECT }
        );
        dimInfo = info;
    }

    const vendedorRows = await sequelize.query(
        'SELECT id_vendedor, codigo_vendedor, nombre FROM vendedor WHERE id_vendedor = :id',
        { replacements: { id: idVendedor }, type: QueryTypes.SELECT, plain: true }
    );

    const replacements = { idVendedor, fechaInicio, fechaFin };
    let sqlDiagnostico;
    let impactos;

    if (tipo === 'cliente') {
        sqlDiagnostico = `
            SELECT
                COUNT(*) AS total_ventas,
                SUM(CASE WHEN v.valor_neto > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%' THEN 1 ELSE 0 END) AS ventas_validas,
                SUM(CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' THEN 1 ELSE 0 END) AS nc_descartadas,
                SUM(CASE WHEN v.valor_neto <= 0 THEN 1 ELSE 0 END) AS valor_invalido_descartado,
                COUNT(DISTINCT CASE WHEN v.valor_neto > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%' THEN v.id_cliente END) AS clientes_unicos_validos
            FROM venta v
            WHERE v.id_vendedor = :idVendedor
              AND v.fecha >= :fechaInicio
              AND v.fecha <= :fechaFin
        `;
        impactos = await calcularImpactosVendedorPeriodo({ idVendedor, fechaInicio, fechaFin });
    } else {
        const dimCol = tipo === 'proveedor' ? 'id_proveedor' : 'id_categoria';
        replacements.idDim = idDim;

        const clientesExpr = tipo === 'categoria'
            ? "COUNT(DISTINCT CASE WHEN v.valor_neto > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%' THEN CONCAT(i.id_proveedor::text, '-', v.id_cliente::text) END)"
            : "COUNT(DISTINCT CASE WHEN v.valor_neto > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%' THEN v.id_cliente END)";

        sqlDiagnostico = `
            SELECT
                COUNT(*) AS total_ventas,
                SUM(CASE WHEN v.valor_neto > 0 AND UPPER(TRIM(v.numero_documento)) NOT LIKE 'NC%' THEN 1 ELSE 0 END) AS ventas_validas,
                SUM(CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' THEN 1 ELSE 0 END) AS nc_descartadas,
                SUM(CASE WHEN v.valor_neto <= 0 THEN 1 ELSE 0 END) AS valor_invalido_descartado,
                ${clientesExpr} AS clientes_unicos_validos
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN item i ON i.id_item = dv.id_item
            WHERE v.id_vendedor = :idVendedor
              AND i.${dimCol} = :idDim
              AND v.fecha >= :fechaInicio
              AND v.fecha <= :fechaFin
        `;
        impactos = await calcularImpactosDimensionPeriodo({ dim: tipo, idVendedor, idDim, fechaInicio, fechaFin });
    }

    const [diagnostico] = await sequelize.query(sqlDiagnostico, { replacements, type: QueryTypes.SELECT });

    return {
        success: true,
        tipo,
        vendedor: {
            id: vendedorRows?.id_vendedor,
            codigo: vendedorRows?.codigo_vendedor,
            nombre: vendedorRows?.nombre
        },
        dimension: dimInfo,
        periodo: { fechaInicio, fechaFin },
        diagnostico: {
            total_ventas: Number(diagnostico.total_ventas) || 0,
            ventas_validas: Number(diagnostico.ventas_validas) || 0,
            nc_descartadas: Number(diagnostico.nc_descartadas) || 0,
            valor_invalido_descartado: Number(diagnostico.valor_invalido_descartado) || 0,
            clientes_unicos_validos: Number(diagnostico.clientes_unicos_validos) || 0
        },
        impactos
    };
}

async function calcularImpactos(tipo, filtros = {}, scope = null) {
    const cfg = TIPOS[tipo];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: vendedores, proveedores o categorias.');
    }

    const replacements = {};
    const tipoPeriodo = toArr(filtros.tipoPeriodo).length ? toArr(filtros.tipoPeriodo) : ['MENSUAL'];

    const dateRow = await sequelize.query(
        `SELECT MIN(fecha_inicio) AS mi, MAX(fecha_fin) AS mf FROM ${cfg.cuotaTable}`,
        { type: QueryTypes.SELECT, plain: true }
    );
    const fechaInicio = filtros.fechaInicio || dateRow?.mi || null;
    const fechaFin = filtros.fechaFin || dateRow?.mf || null;

    const idsCanalCiudad = await resolverVendedoresPorCanalCiudad(filtros);

    const base = { fechaInicio, fechaFin, tipoPeriodo, idsCanalCiudad, replacements, scope, filtros };

    if (tipo === 'vendedores') {
        return await calcularVendedores(base);
    }
    if (tipo === 'proveedores') {
        return await calcularDimension({ ...base, cuotaTable: cfg.cuotaTable }, 'proveedor');
    }
    return await calcularDimension({ ...base, cuotaTable: cfg.cuotaTable }, 'categoria');
}

module.exports = {
    calcularImpactos,
    diagnosticarImpactos,
    _test: { toArr, padCode, extractCategoryName, buildScopeCond }
};
