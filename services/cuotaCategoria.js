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
			cuota: cuota,
			acumulado: acumulado,
			porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
			part: round(part, 2),
			proyectado: round(proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
		};
	});

	const totalCuota = detalle.reduce((acc, row) => round(acc + toNumber(row.cuota), 2), 0);
	const totalProyectado = detalle.reduce((acc, row) => round(acc + toNumber(row.proyectado), 2), 0);
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
			cuota: totalCuota,
			acumulado: totalAcumulado,
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
		)
		SELECT
			c.id_categoria,
			c.nombre,
			0 AS cuota,
			COALESCE(apc.acumulado, 0) AS acumulado
		FROM categoria c
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
		)
		SELECT
			cat.id_categoria,
			cat.nombre AS categoria,
			vqc.cuota,
			COALESCE(apc.acumulado, 0) AS acumulado
		FROM vendedor_cuota_categoria vqc
		JOIN categoria cat ON cat.id_categoria = vqc.id_categoria
		LEFT JOIN acumulado_por_categoria apc ON apc.id_categoria = vqc.id_categoria
		WHERE vqc.id_vendedor = :idVendedor
		  AND vqc.fecha_inicio <= :fechaFin
		  AND vqc.fecha_fin >= :fechaInicio
		ORDER BY cat.nombre ASC
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
		WITH vendedores_con_cuota AS (
			SELECT DISTINCT
				vqc.id_vendedor,
				v.codigo_vendedor,
				v.nombre
			FROM vendedor_cuota_categoria vqc
			JOIN vendedor v ON v.id_vendedor = vqc.id_vendedor
			WHERE vqc.fecha_inicio <= :fechaFin
			  AND vqc.fecha_fin >= :fechaInicio
		),
		acumulado_por_vendedor_categoria AS (
			SELECT
				v.id_vendedor,
				it.id_categoria,
				SUM(COALESCE(dv.subtotal, 0)) AS acumulado
			FROM detalle_venta dv
			JOIN item it ON it.id_item = dv.id_item
			JOIN venta v ON v.id_venta = dv.id_venta
			WHERE v.fecha >= :fechaInicio
			  AND v.fecha <= :fechaFin
			GROUP BY v.id_vendedor, it.id_categoria
		)
		SELECT
			vq.id_vendedor,
			vq.codigo_vendedor,
			vq.nombre AS vendedor,
			c.id_categoria,
			c.nombre AS categoria,
			COALESCE(vqc.cuota, 0) AS cuota,
			COALESCE(avc.acumulado, 0) AS acumulado
		FROM vendedores_con_cuota vq
		CROSS JOIN categoria c
		LEFT JOIN vendedor_cuota_categoria vqc 
			ON vqc.id_vendedor = vq.id_vendedor
			AND vqc.id_categoria = c.id_categoria
			AND vqc.fecha_inicio <= :fechaFin
			AND vqc.fecha_fin >= :fechaInicio
		LEFT JOIN acumulado_por_vendedor_categoria avc 
			ON avc.id_vendedor = vq.id_vendedor
			AND avc.id_categoria = c.id_categoria
		ORDER BY vq.nombre ASC, c.nombre ASC
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
		const totalAcumuladoVendedor = vendedor.categorias.reduce((acc, cat) => round(acc + cat.acumulado, 2), 0);
		const totalCuotaVendedor = vendedor.categorias.reduce((acc, cat) => round(acc + cat.cuota, 2), 0);

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
				totalPorCategoria[cat.id_categoria].cuota = round(totalPorCategoria[cat.id_categoria].cuota + cuota, 2);
				totalPorCategoria[cat.id_categoria].acumulado = round(totalPorCategoria[cat.id_categoria].acumulado + acumulado, 2);
				totalPorCategoria[cat.id_categoria].proyectado = round(totalPorCategoria[cat.id_categoria].proyectado + proyectado, 2);

				return {
					id_categoria: cat.id_categoria,
					categoria: cat.categoria,
					cuota: cuota,
					acumulado: acumulado,
					porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
					proyectado: round(proyectado, 2),
					porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
				};
			}),
			total_vendedor: {
				cuota: totalCuotaVendedor,
				acumulado: totalAcumuladoVendedor,
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
			cuota: cat.cuota,
			acumulado: cat.acumulado,
			porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
			proyectado: round(cat.proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
		};
	});

	// Total general
	const totalGeneral = Object.values(totalPorCategoria).reduce((acc, cat) => ({
		cuota: round(acc.cuota + cat.cuota, 2),
		acumulado: round(acc.acumulado + cat.acumulado, 2),
		proyectado: round(acc.proyectado + cat.proyectado, 2)
	}), { cuota: 0, acumulado: 0, proyectado: 0 })

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
			cuota: totalGeneral.cuota,
			acumulado: totalGeneral.acumulado,
			porcentajeCumplimiento: round(porcentajeCumpGeneral, 2),
			proyectado: round(totalGeneral.proyectado, 2),
			porcentajeCumplimientoProyectado: round(porcentajeCumpProyGeneral, 2)
		}
	};
};

// ✅ VALIDACIÓN DE CUOTAS POR CATEGORÍA Y VENDEDOR
const validateCuotasMarzo = async (fechaInicio = '2026-03-01', fechaFin = '2026-03-31') => {
	try {
		// Obtener todos los vendedores
		const vendedores = await sequelize.query(`
			SELECT v.id_vendedor, v.codigo_vendedor, v.nombre
			FROM vendedor v
			ORDER BY v.codigo_vendedor ASC
		`, { type: QueryTypes.SELECT });

		// Obtener todas las categorías con sus cuotas
		const categorias = await sequelize.query(`
			SELECT DISTINCT
				c.id_categoria,
				c.nombre
			FROM categoria c
			ORDER BY c.nombre ASC
		`, { type: QueryTypes.SELECT });

		// Validar cuotas por vendedor y categoría
		const validaciones = [];
		const warnings = [];

		for (const vendedor of vendedores) {
			const datosVendedor = await getCuotaCategoriaPorVendedor(vendedor.codigo_vendedor, {
				fechaInicio,
				fechaFin
			});

			if (!datosVendedor) {
				warnings.push({
					tipo: 'VENDEDOR_SIN_DATOS',
					vendedor: vendedor.nombre,
					codigo: vendedor.codigo_vendedor,
					mensaje: 'Vendedor no tiene datos de venta en el período'
				});
				continue;
			}

			const detalleVendedor = datosVendedor.detalle || [];
			
			detalleVendedor.forEach(cat => {
				const cuotaEsperada = cat.cuota;
				const acumulado = cat.acumulado;
				const porcentaje = cat.porcentajeCumplimiento;

				validaciones.push({
					vendedor: vendedor.nombre,
					codigo_vendedor: vendedor.codigo_vendedor,
					categoria: cat.categoria,
					cuota_esperada: cuotaEsperada,
					acumulado: acumulado,
					porcentaje_cumplimiento: porcentaje,
					estado: cuotaEsperada > 0 ? 'OK' : 'SIN_CUOTA'
				});
			});
		}

		// Verificar integridad de cuotas en BD
		const cuotasSinFecha = await sequelize.query(`
			SELECT vqc.id_vendedor, vqc.id_categoria, c.nombre, vqc.cuota
			FROM vendedor_cuota_categoria vqc
			JOIN categoria c ON c.id_categoria = vqc.id_categoria
			WHERE vqc.fecha_inicio IS NULL OR vqc.fecha_fin IS NULL
			LIMIT 20
		`, { type: QueryTypes.SELECT });

		if (cuotasSinFecha.length > 0) {
			warnings.push({
				tipo: 'CUOTAS_SIN_FECHAS',
				cantidad: cuotasSinFecha.length,
				mensaje: 'Existen cuotas sin fechas de inicio/fin definidas',
				ejemplos: cuotasSinFecha.slice(0, 5)
			});
		}

		return {
			periodo: { fechaInicio, fechaFin },
			resumen: {
				total_vendedores: vendedores.length,
				total_categorias: categorias.length,
				total_validaciones: validaciones.length
			},
			validaciones,
			warnings,
			timestamp: new Date().toISOString()
		};

	} catch (error) {
		return {
			error: true,
			mensaje: error.message,
			stack: error.stack
		};
	}
};

// ✅ COMPARAR CUOTAS DEL CSV CON BD
const compareCuotasCSVvsBD = async (datosCSV, fechaInicio = '2026-03-01') => {
	try {
		const discrepancias = [];
		const coincidencias = [];

		// datosCSV debe ser un array: [{ codigo_vendedor, categorias: { codigo: cuota } }]
		for (const registro of datosCSV) {
			const { codigo_vendedor, categorias } = registro;

			// Obtener datos de BD
			const datoBD = await getCuotaCategoriaPorVendedor(codigo_vendedor, { fechaInicio });

			if (!datoBD) {
				discrepancias.push({
					codigo_vendedor,
					tipo: 'VENDEDOR_NO_ENCONTRADO',
					mensaje: `Vendedor ${codigo_vendedor} no existe en BD`
				});
				continue;
			}

			// Comparar cada categoría
			const detalleCSV = Object.entries(categorias);
			const detalleBD = datoBD.detalle || [];

			detalleCSV.forEach(([codigoCategoria, cuotaCSV]) => {
				const enBD = detalleBD.find(cat => 
					cat.categoria.toLowerCase().includes(codigoCategoria.toLowerCase())
				);

				if (!enBD) {
					discrepancias.push({
						codigo_vendedor,
						categoria: codigoCategoria,
						cuota_csv: cuotaCSV,
						tipo: 'CATEGORIA_NO_ENCONTRADA',
						mensaje: `Categoría ${codigoCategoria} no tiene datos en BD para este vendedor`
					});
				} else if (toNumber(enBD.cuota) !== toNumber(cuotaCSV)) {
					discrepancias.push({
						codigo_vendedor,
						categoria: codigoCategoria,
						cuota_csv: cuotaCSV,
						cuota_bd: enBD.cuota,
						diferencia: toNumber(cuotaCSV) - toNumber(enBD.cuota),
						mensaje: `Cuota no coincide para ${codigoCategoria}`
					});
				} else {
					coincidencias.push({
						codigo_vendedor,
						categoria: codigoCategoria,
						cuota: cuotaCSV,
						estado: 'VERIFICADO'
					});
				}
			});
		}

		return {
			total_coincidencias: coincidencias.length,
			total_discrepancias: discrepancias.length,
			coincidencias: coincidencias.slice(0, 10),
			discrepancias,
			porcentaje_integridad: coincidencias.length > 0 
				? ((coincidencias.length / (coincidencias.length + discrepancias.length)) * 100).toFixed(2) 
				: 0
		};

	} catch (error) {
		return {
			error: true,
			mensaje: error.message
		};
	}
};

module.exports = {
	getCuotaCategoriaGeneral,
	getCuotaCategoriaPorVendedor,
	getCuotaCategoriaTodosVendedores,
	validateCuotasMarzo,
	compareCuotasCSVvsBD
};
