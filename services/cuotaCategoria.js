const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');

const toNumber = (value) => Number(value || 0);

const round = (value, decimals = 2) => {
	const factor = 10 ** decimals;
	return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
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

const buildCuotaCategoriaPayload = async (rows, period, extra = {}) => {
	const { diasCorridos, diasHabiles } = await getRangoDias(period.fechaInicio, period.fechaFin);
	const totalAcumulado = rows.reduce((acc, row) => acc + toNumber(row.acumulado), 0);

	const detalle = rows.map((row) => {
		const cuota = toNumber(row.cuota);
		const acumulado = toNumber(row.acumulado);
		const porcentajeCumplimiento = cuota > 0 ? (acumulado / cuota) * 100 : 0;
		const part = totalAcumulado > 0 ? (acumulado / totalAcumulado) * 100 : 0;
		const proyectado = diasCorridos > 0 ? (acumulado / diasCorridos) * diasHabiles : 0;
		const porcentajeCumplimientoProyectado = cuota > 0 ? (proyectado / cuota) * 100 : 0;

		return {
			id_categoria: row.id_categoria,
			categoria: row.categoria,
			cuota: round(cuota, 2),
			acumulado: round(acumulado, 2),
			porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
			part: round(part, 2),
			proyectado: round(proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
		};
	});

	const totalCuota = detalle.reduce((acc, row) => acc + toNumber(row.cuota), 0);
	const totalProyectado = detalle.reduce((acc, row) => acc + toNumber(row.proyectado), 0);
	const totalPorcentajeCumplimiento = totalCuota > 0 ? (totalAcumulado / totalCuota) * 100 : 0;
	const totalPorcentajeCumplimientoProyectado = totalCuota > 0 ? (totalProyectado / totalCuota) * 100 : 0;

	return {
		...extra,
		periodo: {
			fechaInicio: period.fechaInicio,
			fechaFin: period.fechaFin,
			dias_corridos: diasCorridos,
			dias_habiles: diasHabiles
		},
		detalle,
		total: {
			categoria: 'TOTAL X CATEGORIA',
			cuota: round(totalCuota, 2),
			acumulado: round(totalAcumulado, 2),
			porcentajeCumplimiento: round(totalPorcentajeCumplimiento, 2),
			part: round(totalAcumulado > 0 ? 100 : 0, 2),
			proyectado: round(totalProyectado, 2),
			porcentajeCumplimientoProyectado: round(totalPorcentajeCumplimientoProyectado, 2)
		}
	};
};

const getCuotaCategoriaGeneral = async (filters = {}) => {
	const period = normalizePeriodFilters(filters);

	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin
	};

	const rows = await sequelize.query(`
		WITH acumulado_por_categoria AS (
			SELECT
				it.id_categoria,
				SUM(COALESCE(dv.subtotal, 0)) AS acumulado
			FROM detalle_venta dv
			JOIN item it ON it.id_item = dv.id_item
			JOIN venta v ON v.id_venta = dv.id_venta
			WHERE v.fecha >= :fechaInicio
			  AND v.fecha <= :fechaFin
			GROUP BY it.id_categoria
		),
		categorias_distintas AS (
			SELECT
				MIN(id_categoria) AS id_categoria,
				nombre,
				MIN(id_cuota_categoria) AS id_cuota_categoria
			FROM categoria
			GROUP BY nombre
		)
		SELECT
			c.id_categoria,
			c.nombre AS categoria,
			COALESCE(cc.cuota, 0) AS cuota,
			COALESCE(apc.acumulado, 0) AS acumulado
		FROM categorias_distintas c
		LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
		LEFT JOIN acumulado_por_categoria apc ON apc.id_categoria = c.id_categoria
		ORDER BY c.nombre ASC
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	return buildCuotaCategoriaPayload(rows, period);
};

const getCuotaCategoriaPorVendedor = async (codigoVendedor, filters = {}) => {
	const codigoNormalizado = String(codigoVendedor || '').trim();
	if (!codigoNormalizado) return null;

	const vendedor = await sequelize.query(`
		SELECT id_vendedor, codigo_vendedor, nombre
		FROM vendedor
		WHERE codigo_vendedor = :codigoVendedor
		LIMIT 1
	`, {
		replacements: { codigoVendedor: codigoNormalizado },
		type: QueryTypes.SELECT,
		plain: true
	});

	if (!vendedor) return null;

	const period = normalizePeriodFilters(filters);
	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin,
		idVendedor: vendedor.id_vendedor
	};

	const rows = await sequelize.query(`
		WITH acumulado_por_categoria AS (
			SELECT
				it.id_categoria,
				SUM(COALESCE(dv.subtotal, 0)) AS acumulado
			FROM detalle_venta dv
			JOIN item it ON it.id_item = dv.id_item
			JOIN venta v ON v.id_venta = dv.id_venta
			WHERE v.fecha >= :fechaInicio
			  AND v.fecha <= :fechaFin
			  AND v.id_vendedor = :idVendedor
			GROUP BY it.id_categoria
		),
		categorias_distintas AS (
			SELECT
				MIN(id_categoria) AS id_categoria,
				nombre,
				MIN(id_cuota_categoria) AS id_cuota_categoria
			FROM categoria
			GROUP BY nombre
		)
		SELECT
			c.id_categoria,
			c.nombre AS categoria,
			COALESCE(cc.cuota, 0) AS cuota,
			COALESCE(apc.acumulado, 0) AS acumulado
		FROM categorias_distintas c
		LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
		LEFT JOIN acumulado_por_categoria apc ON apc.id_categoria = c.id_categoria
		ORDER BY c.nombre ASC
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	return buildCuotaCategoriaPayload(rows, period, {
		vendedor: {
			id_vendedor: vendedor.id_vendedor,
			codigo_vendedor: vendedor.codigo_vendedor,
			nombre: vendedor.nombre
		}
	});
};

const getCuotaCategoriaTodosVendedores = async (filters = {}) => {
	const period = normalizePeriodFilters(filters);
	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin
	};

	const rows = await sequelize.query(`
		WITH acumulado_por_vendedor_categoria AS (
			SELECT
				v.id_vendedor,
				vd.codigo_vendedor,
				vd.nombre AS vendedor,
				it.id_categoria,
				SUM(COALESCE(dv.subtotal, 0)) AS acumulado
			FROM detalle_venta dv
			JOIN item it ON it.id_item = dv.id_item
			JOIN venta v ON v.id_venta = dv.id_venta
			JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
			WHERE v.fecha >= :fechaInicio
			  AND v.fecha <= :fechaFin
			GROUP BY v.id_vendedor, vd.codigo_vendedor, vd.nombre, it.id_categoria
		),
		categorias_distintas AS (
			SELECT
				MIN(id_categoria) AS id_categoria,
				nombre,
				MIN(id_cuota_categoria) AS id_cuota_categoria
			FROM categoria
			GROUP BY nombre
		)
		SELECT
			avc.id_vendedor,
			avc.codigo_vendedor,
			avc.vendedor,
			c.id_categoria,
			c.nombre AS categoria,
			COALESCE(cc.cuota, 0) AS cuota,
			COALESCE(avc.acumulado, 0) AS acumulado
		FROM categorias_distintas c
		CROSS JOIN (
			SELECT DISTINCT id_vendedor, codigo_vendedor, vendedor
			FROM acumulado_por_vendedor_categoria
		) vendedores_distintos
		LEFT JOIN acumulado_por_vendedor_categoria avc 
			ON avc.id_categoria = c.id_categoria 
			AND avc.id_vendedor = vendedores_distintos.id_vendedor
		LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
		ORDER BY avc.vendedor ASC, c.nombre ASC
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	const { diasCorridos, diasHabiles } = await getRangoDias(period.fechaInicio, period.fechaFin);

	// Agrupar por vendedor
	const vendedoresMap = new Map();
	const categoriasSet = new Set();

	rows.forEach((row) => {
		const vendedorKey = row.id_vendedor;
		const categoriaKey = row.id_categoria;

		categoriasSet.add(categoriaKey);

		if (!vendedoresMap.has(vendedorKey)) {
			vendedoresMap.set(vendedorKey, {
				id_vendedor: row.id_vendedor,
				codigo_vendedor: row.codigo_vendedor,
				nombre_vendedor: row.vendedor,
				categorias: []
			});
		}

		vendedoresMap.get(vendedorKey).categorias.push({
			id_categoria: row.id_categoria,
			categoria: row.categoria,
			cuota: toNumber(row.cuota),
			acumulado: toNumber(row.acumulado)
		});
	});

	// Construir respuesta con totales por categoría y por vendedor
	const detalle = [];
	const totalPorCategoria = {};

	vendedoresMap.forEach((vendedor) => {
		const totalAcumuladoVendedor = vendedor.categorias.reduce((acc, cat) => acc + cat.acumulado, 0);
		const totalCuotaVendedor = vendedor.categorias.reduce((acc, cat) => acc + cat.cuota, 0);

		const vendedorData = {
			vendedor: {
				id_vendedor: vendedor.id_vendedor,
				codigo_vendedor: vendedor.codigo_vendedor,
				nombre: vendedor.nombre_vendedor
			},
			categorias: vendedor.categorias.map((cat) => {
				const cuota = cat.cuota;
				const acumulado = cat.acumulado;
				const porcentajeCumplimiento = cuota > 0 ? (acumulado / cuota) * 100 : 0;
				const proyectado = diasCorridos > 0 ? (acumulado / diasCorridos) * diasHabiles : 0;
				const porcentajeCumplimientoProyectado = cuota > 0 ? (proyectado / cuota) * 100 : 0;

				// Acumular totales por categoría
				if (!totalPorCategoria[cat.id_categoria]) {
					totalPorCategoria[cat.id_categoria] = {
						id_categoria: cat.id_categoria,
						categoria: cat.categoria,
						cuota: 0,
						acumulado: 0,
						proyectado: 0
					};
				}
				totalPorCategoria[cat.id_categoria].cuota += cuota;
				totalPorCategoria[cat.id_categoria].acumulado += acumulado;
				totalPorCategoria[cat.id_categoria].proyectado += proyectado;

				return {
					id_categoria: cat.id_categoria,
					categoria: cat.categoria,
					cuota: round(cuota, 2),
					acumulado: round(acumulado, 2),
					porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
					proyectado: round(proyectado, 2),
					porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
				};
			}),
			total_vendedor: {
				cuota: round(totalCuotaVendedor, 2),
				acumulado: round(totalAcumuladoVendedor, 2),
				porcentajeCumplimiento: round(totalCuotaVendedor > 0 ? (totalAcumuladoVendedor / totalCuotaVendedor) * 100 : 0, 2),
				proyectado: round(diasCorridos > 0 ? (totalAcumuladoVendedor / diasCorridos) * diasHabiles : 0, 2)
			}
		};

		detalle.push(vendedorData);
	});

	// Construir totales por categoría
	const totalesCategoria = Object.values(totalPorCategoria).map((cat) => {
		const porcentajeCumplimiento = cat.cuota > 0 ? (cat.acumulado / cat.cuota) * 100 : 0;
		const porcentajeCumplimientoProyectado = cat.cuota > 0 ? (cat.proyectado / cat.cuota) * 100 : 0;

		return {
			id_categoria: cat.id_categoria,
			categoria: cat.categoria,
			cuota: round(cat.cuota, 2),
			acumulado: round(cat.acumulado, 2),
			porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
			proyectado: round(cat.proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
		};
	});

	// Total general
	const totalGeneral = Object.values(totalPorCategoria).reduce((acc, cat) => ({
		cuota: acc.cuota + cat.cuota,
		acumulado: acc.acumulado + cat.acumulado,
		proyectado: acc.proyectado + cat.proyectado
	}), { cuota: 0, acumulado: 0, proyectado: 0 });

	const porcentajeCumpGeneral = totalGeneral.cuota > 0 ? (totalGeneral.acumulado / totalGeneral.cuota) * 100 : 0;
	const porcentajeCumpProyGeneral = totalGeneral.cuota > 0 ? (totalGeneral.proyectado / totalGeneral.cuota) * 100 : 0;

	return {
		periodo: {
			fechaInicio: period.fechaInicio,
			fechaFin: period.fechaFin,
			dias_corridos: diasCorridos,
			dias_habiles: diasHabiles
		},
		detalle,
		totales_por_categoria: totalesCategoria,
		total_general: {
			cuota: round(totalGeneral.cuota, 2),
			acumulado: round(totalGeneral.acumulado, 2),
			porcentajeCumplimiento: round(porcentajeCumpGeneral, 2),
			proyectado: round(totalGeneral.proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumpProyGeneral, 2)
		}
	};
};

module.exports = {
	getCuotaCategoriaGeneral,
	getCuotaCategoriaPorVendedor,
	getCuotaCategoriaTodosVendedores
};
