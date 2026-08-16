'use strict';

const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');
const { getVendedorScopeFromAuth, buildScopeWhereVenta } = require('../utils/scopeHelper');

const toNumber = (value) => Number(value || 0);

const round = (value, decimals = 2) => {
	const factor = 10 ** decimals;
	return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const calcularParticipacion = (parte, total) => {
	const t = toNumber(total);
	return t > 0 ? (toNumber(parte) / t) * 100 : 0;
};

const toDateOnly = (value) => {
	if (!value) {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), today.getDate());
	}

	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	const date = new Date(value);
	date.setHours(0, 0, 0, 0);
	return date;
};

const formatDateOnly = (date) => {
	const localDate = toDateOnly(date);
	const year = localDate.getFullYear();
	const month = String(localDate.getMonth() + 1).padStart(2, '0');
	const day = String(localDate.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const getMonthRange = (baseDate = new Date()) => {
	const year = baseDate.getFullYear();
	const month = baseDate.getMonth();
	const start = new Date(year, month, 1);
	const end = new Date(year, month + 1, 0);
	start.setHours(0, 0, 0, 0);
	end.setHours(0, 0, 0, 0);
	return { start, end };
};

const normalizePeriodFilters = (filters = {}) => {
	if (filters.fechaInicio && filters.fechaFin) {
		return {
			fechaInicio: formatDateOnly(filters.fechaInicio),
			fechaFin: formatDateOnly(filters.fechaFin)
		};
	}

	const base = filters.fechaInicio ? toDateOnly(filters.fechaInicio) : new Date();
	const { start, end } = getMonthRange(base);

	return {
		fechaInicio: formatDateOnly(start),
		fechaFin: formatDateOnly(end)
	};
};

const toArr = (val) => {
	if (val == null || val === '') return null;
	const raw = Array.isArray(val) ? val : String(val).split(',');
	const flat = raw.flatMap((v) => String(v).split(',').map((s) => s.trim())).filter(Boolean);
	const arr = [...new Set(flat)];
	return arr.length ? arr : null;
};

const calculateRangoFromPeriod = (fechaInicio, fechaFin) => {
	const resumen = getResumenPeriodoLaboral({
		fechaInicio,
		fechaFin,
		fechaCorte: new Date()
	});

	return {
		diasCorridos: toNumber(resumen.dias_corridos),
		diasHabiles: toNumber(resumen.dias_habiles)
	};
};

const getRangoDias = async (fechaInicio, fechaFin) => {
	const where = {
		fecha_inicio: { [Op.lte]: fechaFin },
		fecha_fin: { [Op.gte]: fechaInicio }
	};

	const rango = await rango_dias_model.findOne({
		where,
		order: [['fecha_fin', 'DESC']]
	});

	if (!rango) {
		return calculateRangoFromPeriod(fechaInicio, fechaFin);
	}

	return {
		diasCorridos: toNumber(rango.dias_corridos),
		diasHabiles: toNumber(rango.dias_habiles)
	};
};

const SQL_ACUMULADO_SIGNADO = `
    SUM(CASE
        WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%'
            THEN -ABS(COALESCE(dv.subtotal, 0))
        ELSE COALESCE(dv.subtotal, 0)
    END)
`;

/**
 * Ventas acumuladas por canal para el período.
 *
 * RF-001: listar solo los canales del catálogo que tengan venta acumulada
 *         mayor a 0 (admin y supervisor).
 * RF-002: sin cuota asignada por canal → cuota = 0 y porcentajes 0.
 * RF-003: proyección con días corridos/hábiles del período.
 * RF-004: respeta el motor de filtros actual (vendedor, proveedor,
 *         categoría, ciudad) + filtro propio por canal.
 *
 * @param {object} [filters={}] fechaInicio, fechaFin, mesAnio,
 *   canal[], vendedor[], proveedor[], categoria[], ciudad[]
 * @param {{idUsuario?: number, rol?: number|string} | null} [auth=null]
 * @returns {Promise<{periodo, detalle, total, scope}>}
 */
const getVentasPorCanal = async (filters = {}, auth = null) => {
	const period = normalizePeriodFilters(filters);
	const scope = await getVendedorScopeFromAuth(auth);
	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin
	};

	const scopeWhere = buildScopeWhereVenta(scope, 'v.id_vendedor', replacements);

	const vendedoresFiltro = toArr(filters.vendedores) || toArr(filters.vendedor);
	const proveedoresFiltro = toArr(filters.proveedores) || toArr(filters.proveedor);
	const categoriasFiltro = toArr(filters.categorias) || toArr(filters.categoria);
	const ciudadesFiltro = toArr(filters.ciudades) || toArr(filters.ciudad);
	const canalesFiltro = toArr(filters.canales) || toArr(filters.canal);

	let extraWhere = '';
	let joins = '';

	if (vendedoresFiltro && vendedoresFiltro.length) {
		const placeholders = vendedoresFiltro.map((_, i) => `:fVend${i}`).join(',');
		vendedoresFiltro.forEach((v, i) => { replacements[`fVend${i}`] = v; });
		extraWhere += ` AND vd.codigo_vendedor IN (${placeholders}) `;
		joins += ' LEFT JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor ';
	}

	if ((proveedoresFiltro && proveedoresFiltro.length) ||
	    (categoriasFiltro && categoriasFiltro.length)) {
		joins += ' LEFT JOIN item it ON it.id_item = dv.id_item ';
	}

	if (proveedoresFiltro && proveedoresFiltro.length) {
		const placeholders = proveedoresFiltro.map((_, i) => `:fProv${i}`).join(',');
		proveedoresFiltro.forEach((p, i) => { replacements[`fProv${i}`] = p; });
		extraWhere += ` AND it.id_proveedor IN (${placeholders}) `;
		joins += ' LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor ';
	}

	if (categoriasFiltro && categoriasFiltro.length) {
		const placeholders = categoriasFiltro.map((_, i) => `:fCat${i}`).join(',');
		categoriasFiltro.forEach((c, i) => { replacements[`fCat${i}`] = c; });
		extraWhere += ` AND it.id_categoria IN (${placeholders}) `;
		joins += ' LEFT JOIN categoria cat ON cat.id_categoria = it.id_categoria ';
	}

	if (ciudadesFiltro && ciudadesFiltro.length) {
		const placeholders = ciudadesFiltro.map((_, i) => `:fCiu${i}`).join(',');
		ciudadesFiltro.forEach((c, i) => { replacements[`fCiu${i}`] = c; });
		extraWhere += ` AND dv.id_ciudad_original IN (${placeholders}) `;
		joins += ' LEFT JOIN ciudad ci ON ci.id_ciudad = dv.id_ciudad_original ';
	}

	// Catálogo completo de canales: base del reporte.
	const catalogoCanales = await sequelize.query(`
		SELECT id_canal, COALESCE(TRIM(nombre), '') AS nombre
		FROM canal
		ORDER BY COALESCE(TRIM(nombre), '')
	`, { type: QueryTypes.SELECT });

	// Acumulado de ventas agrupado por canal (NC restan).
	const acumuladoRows = await sequelize.query(`
		SELECT
			COALESCE(v.id_canal, 0) AS id_canal,
			COALESCE(TRIM(c.nombre), 'SIN CANAL') AS canal,
			${SQL_ACUMULADO_SIGNADO} AS acumulado
		FROM venta v
		LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
		LEFT JOIN canal c ON c.id_canal = v.id_canal
		${joins}
		WHERE v.fecha >= :fechaInicio
		  AND v.fecha <= :fechaFin
		  ${scopeWhere}
		  ${extraWhere}
		GROUP BY COALESCE(v.id_canal, 0), COALESCE(TRIM(c.nombre), 'SIN CANAL')
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	const acumuladoIndex = new Map();
	acumuladoRows.forEach((r) => {
		acumuladoIndex.set(Number(r.id_canal), toNumber(r.acumulado));
	});

	// Si se filtra por canal, limitar el catálogo mostrado.
	const idsCanalFiltrados = canalesFiltro
		? new Set(canalesFiltro.map((c) => Number(c)))
		: null;

	let rows = catalogoCanales.map((c) => {
		const idCanal = c.id_canal != null ? Number(c.id_canal) : 0;
		const nombre = (c.nombre || '').trim();
		return {
			id_canal: idCanal,
			canal: nombre || `CANAL ${idCanal}`,
			acumulado: acumuladoIndex.get(idCanal) || 0
		};
	});

	if (idsCanalFiltrados) {
		rows = rows.filter((r) => idsCanalFiltrados.has(r.id_canal));
	}

	// Preservar canal "SIN CANAL" si hay ventas con id_canal nulo y no está en catálogo.
	if (!idsCanalFiltrados || idsCanalFiltrados.has(0)) {
		const sinCanalAcumulado = acumuladoIndex.get(0) || 0;
		if (sinCanalAcumulado !== 0) {
			const existe = rows.some((r) => r.id_canal === 0);
			if (!existe) {
				rows.push({ id_canal: 0, canal: 'SIN CANAL', acumulado: sinCanalAcumulado });
			}
		}
	}

	// Admin y supervisor: solo canales con venta acumulada mayor a 0.
	rows = rows.filter((r) => r.acumulado > 0);

	rows.sort((a, b) => String(a.canal).localeCompare(String(b.canal), 'es', { sensitivity: 'base' }));

	const { diasCorridos, diasHabiles } = await getRangoDias(period.fechaInicio, period.fechaFin);
	const totalAcumulado = rows.reduce((acc, row) => acc + toNumber(row.acumulado), 0);

	const detalle = rows.map((row) => {
		const cuota = 0;
		const acumulado = toNumber(row.acumulado);
		const participacion = calcularParticipacion(acumulado, totalAcumulado);
		const proyectado = diasCorridos > 0 ? (acumulado / diasCorridos) * diasHabiles : 0;
		const porcentajeCumplimientoProyectado = 0;

		return {
			id_canal: row.id_canal,
			canal: row.canal,
			cuota,
			acumulado,
			porcentajeCumplimiento: round(participacion, 2),
			part: round(participacion, 2),
			proyectado: round(proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
		};
	});

	const totalProyectado = detalle.reduce((acc, row) => round(acc + toNumber(row.proyectado), 2), 0);

	return {
		periodo: {
			fechaInicio: period.fechaInicio,
			fechaFin: period.fechaFin,
			dias_corridos: diasCorridos,
			dias_habiles: diasHabiles
		},
		detalle,
		total: {
			canal: 'TOTAL X CANAL',
			cuota: 0,
			acumulado: totalAcumulado,
			porcentajeCumplimiento: round(calcularParticipacion(totalAcumulado, totalAcumulado), 2),
			part: round(calcularParticipacion(totalAcumulado, totalAcumulado), 2),
			proyectado: totalProyectado,
			porcentajeCumplimientoProyectado: 0
		},
		scope: { tipo: scope.tipo }
	};
};

module.exports = {
	getVentasPorCanal,
	calcularParticipacion
};
