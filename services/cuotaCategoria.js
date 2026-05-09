const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model } = require('../models');
const { getResumenPeriodoLaboral } = require('../utils/calendarioLaboralColombia');
const { getCategoriaIdFromProveedor } = require('./mapeoProveedorCategoria');

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

	// Obtener acumulado de VENTAS por categoría
	const acumuladoPorCategoria = await sequelize.query(`
		SELECT
			it.id_categoria,
			SUM(COALESCE(dv.subtotal, 0)) AS acumulado
		FROM detalle_venta dv
		JOIN item it ON it.id_item = dv.id_item
		JOIN venta v ON v.id_venta = dv.id_venta
		WHERE v.fecha >= :fechaInicio
		  AND v.fecha <= :fechaFin
		GROUP BY it.id_categoria
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener CUOTAS de PROVEEDOR (fuente de verdad correcta)
	const cuotasPorProveedor = await sequelize.query(`
		SELECT
			p.nombre AS proveedor,
			SUM(cp.cuota) AS cuota_total
		FROM "vendedorCuotaProveedor" vcp
		JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
		JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
		WHERE cp.fecha_fin >= :fechaInicio
		  AND cp.fecha_inicio <= :fechaFin
		GROUP BY p.nombre
		ORDER BY p.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Mapear a categorías
	const cuotasPorCategoria = new Map();
	
	// Inicializar con acumulados
	acumuladoPorCategoria.forEach((acc) => {
		cuotasPorCategoria.set(acc.id_categoria, {
			id_categoria: acc.id_categoria,
			cuota: 0,
			acumulado: toNumber(acc.acumulado)
		});
	});

	// Agregar cuotas
	cuotasPorProveedor.forEach((cuota) => {
		const idCategoria = getCategoriaIdFromProveedor(cuota.proveedor);
		if (idCategoria) {
			if (!cuotasPorCategoria.has(idCategoria)) {
				cuotasPorCategoria.set(idCategoria, {
					id_categoria: idCategoria,
					cuota: 0,
					acumulado: 0
				});
			}
			const item = cuotasPorCategoria.get(idCategoria);
			item.cuota = toNumber(item.cuota) + toNumber(cuota.cuota_total);
		}
	});

	// Obtener nombres de categorías
	const todasLasCategorias = await sequelize.query(`
		SELECT id_categoria, nombre FROM categoria
	`, {
		type: QueryTypes.SELECT
	});

	// Construir array final
	const rows = Array.from(cuotasPorCategoria.values()).map((item) => {
		const categoria = todasLasCategorias.find(c => c.id_categoria === item.id_categoria);
		return {
			id_categoria: item.id_categoria,
			categoria: categoria?.nombre || `Categoría ${item.id_categoria}`,
			cuota: item.cuota,
			acumulado: item.acumulado
		};
	});

	// Agregar categorías con acumulado pero sin cuota
	todasLasCategorias.forEach((cat) => {
		if (!cuotasPorCategoria.has(cat.id_categoria)) {
			const acum = acumuladoPorCategoria.find(a => a.id_categoria === cat.id_categoria);
			if (acum && toNumber(acum.acumulado) > 0) {
				rows.push({
					id_categoria: cat.id_categoria,
					categoria: cat.nombre,
					cuota: 0,
					acumulado: toNumber(acum.acumulado)
				});
			}
		}
	});

	rows.sort((a, b) => a.categoria.localeCompare(b.categoria));

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

	// Obtener datos de VENTAS por categoría
	const acumuladoPorCategoria = await sequelize.query(`
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
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener CUOTAS de PROVEEDOR (fuente de verdad correcta)
	const cuotasPorProveedor = await sequelize.query(`
		SELECT
			p.nombre AS proveedor,
			MAX(cp.cuota) AS cuota_max,
			cp.fecha_inicio,
			cp.fecha_fin
		FROM "vendedorCuotaProveedor" vcp
		JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
		JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
		WHERE vcp.id_vendedor = :idVendedor
		  AND cp.fecha_fin >= :fechaInicio
		  AND cp.fecha_inicio <= :fechaFin
		GROUP BY p.nombre, cp.fecha_inicio, cp.fecha_fin
		ORDER BY p.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener todas las categorías para referencia
	const todasLasCategorias = await sequelize.query(`
		SELECT id_categoria, nombre
		FROM categoria
		ORDER BY nombre
	`, {
		type: QueryTypes.SELECT
	});

	// Mapear cuotas de proveedor a categorías
	const cuotasPorCategoria = new Map();
	
	// Inicializar con acumulados
	acumuladoPorCategoria.forEach((acc) => {
		cuotasPorCategoria.set(acc.id_categoria, {
			id_categoria: acc.id_categoria,
			cuota: 0,
			acumulado: toNumber(acc.acumulado)
		});
	});

	// Agregar cuotas mapeadas
	cuotasPorProveedor.forEach((cuota) => {
		const idCategoria = getCategoriaIdFromProveedor(cuota.proveedor);
		if (idCategoria) {
			if (!cuotasPorCategoria.has(idCategoria)) {
				cuotasPorCategoria.set(idCategoria, {
					id_categoria: idCategoria,
					cuota: 0,
					acumulado: 0
				});
			}
			const item = cuotasPorCategoria.get(idCategoria);
			item.cuota = toNumber(item.cuota) + toNumber(cuota.cuota_max);
		}
	});

	// Construir array de filas con nombres de categoría
	const rows = Array.from(cuotasPorCategoria.values()).map((item) => {
		const categoria = todasLasCategorias.find(c => c.id_categoria === item.id_categoria);
		return {
			id_categoria: item.id_categoria,
			categoria: categoria?.nombre || `Categoría ${item.id_categoria}`,
			cuota: item.cuota,
			acumulado: item.acumulado
		};
	});

	// Asegurar que todas las categorías estén incluidas si tienen acumulado
	todasLasCategorias.forEach((cat) => {
		if (!cuotasPorCategoria.has(cat.id_categoria)) {
			const acum = acumuladoPorCategoria.find(a => a.id_categoria === cat.id_categoria);
			if (acum && toNumber(acum.acumulado) > 0) {
				rows.push({
					id_categoria: cat.id_categoria,
					categoria: cat.nombre,
					cuota: 0,
					acumulado: toNumber(acum.acumulado)
				});
			}
		}
	});

	// Ordenar por nombre
	rows.sort((a, b) => a.categoria.localeCompare(b.categoria));

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

	// Obtener vendedores que tienen cuotas de PROVEEDOR
	const vendedoresConCuota = await sequelize.query(`
		SELECT DISTINCT
			vcp.id_vendedor,
			v.codigo_vendedor,
			v.nombre
		FROM "vendedorCuotaProveedor" vcp
		JOIN vendedor v ON v.id_vendedor = vcp.id_vendedor
		WHERE EXISTS (
			SELECT 1 FROM "cuotaProveedor" cp
			WHERE cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
			AND cp.fecha_fin >= :fechaInicio
			AND cp.fecha_inicio <= :fechaFin
		)
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener acumulados por vendedor y categoría
	const acumuladoPorVendedorCategoria = await sequelize.query(`
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
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener cuotas de PROVEEDOR para todos los vendedores
	const cuotasPorVendedorProveedor = await sequelize.query(`
		SELECT
			vcp.id_vendedor,
			p.nombre AS proveedor,
			MAX(cp.cuota) AS cuota
		FROM "vendedorCuotaProveedor" vcp
		JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
		JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
		WHERE cp.fecha_fin >= :fechaInicio
		  AND cp.fecha_inicio <= :fechaFin
		GROUP BY vcp.id_vendedor, p.nombre
		ORDER BY vcp.id_vendedor, p.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Obtener todas las categorías
	const todasLasCategorias = await sequelize.query(`
		SELECT id_categoria, nombre FROM categoria ORDER BY nombre
	`, {
		type: QueryTypes.SELECT
	});

	const { diasCorridos, diasHabiles } = await getRangoDias(period.fechaInicio, period.fechaFin);

	// Procesar datos en memoria
	const vendedoresMap = new Map();
	const totalPorCategoria = {};

	// Para cada vendedor
	vendedoresConCuota.forEach((vendedor) => {
		const vendedorKey = vendedor.id_vendedor;

		// Inicializar mapa de vendedor
		if (!vendedoresMap.has(vendedorKey)) {
			vendedoresMap.set(vendedorKey, {
				id_vendedor: vendedor.id_vendedor,
				codigo_vendedor: vendedor.codigo_vendedor,
				nombre_vendedor: vendedor.nombre,
				cuotasPorCategoria: new Map() // id_categoria -> cuota
			});
		}

		// Agregar cuotas mapeadas para este vendedor
		const cuotasVendedor = cuotasPorVendedorProveedor.filter(c => c.id_vendedor === vendedorKey);
		cuotasVendedor.forEach((cuota) => {
			const idCategoria = getCategoriaIdFromProveedor(cuota.proveedor);
			if (idCategoria) {
				const vendedorData = vendedoresMap.get(vendedorKey);
				const cuotaActual = vendedorData.cuotasPorCategoria.get(idCategoria) || 0;
				vendedorData.cuotasPorCategoria.set(idCategoria, toNumber(cuotaActual) + toNumber(cuota.cuota));
			}
		});
	});

	// Construir respuesta final
	const detalle = [];
	const categoriasProcessadas = new Set();

	vendedoresMap.forEach((vendedor) => {
		const categorias = [];

		// Agregar todas las categorías
		todasLasCategorias.forEach((cat) => {
			const cuota = toNumber(vendedor.cuotasPorCategoria.get(cat.id_categoria) || 0);
			const acumulados = acumuladoPorVendedorCategoria.filter(
				a => a.id_vendedor === vendedor.id_vendedor && a.id_categoria === cat.id_categoria
			);
			const acumulado = acumulados.length > 0 ? toNumber(acumulados[0].acumulado) : 0;

			if (cuota > 0 || acumulado > 0) {
				const porcentajeCumplimiento = cuota > 0 ? (acumulado / cuota) * 100 : 0;
				const proyectado = diasCorridos > 0 ? (acumulado / diasCorridos) * diasHabiles : 0;
				const porcentajeCumplimientoProyectado = cuota > 0 ? (proyectado / cuota) * 100 : 0;

				categorias.push({
					id_categoria: cat.id_categoria,
					categoria: cat.nombre,
					cuota: cuota,
					acumulado: acumulado,
					porcentajeCumplimiento: round(porcentajeCumplimiento, 2),
					proyectado: round(proyectado, 2),
					porcentajeCumplimientoProyectado: round(porcentajeCumplimientoProyectado, 2)
				});

				// Acumular totales por categoría
				categoriasProcessadas.add(cat.id_categoria);
				if (!totalPorCategoria[cat.id_categoria]) {
					totalPorCategoria[cat.id_categoria] = {
						id_categoria: cat.id_categoria,
						categoria: cat.nombre,
						cuota: 0,
						acumulado: 0,
						proyectado: 0
					};
				}
				totalPorCategoria[cat.id_categoria].cuota = round(totalPorCategoria[cat.id_categoria].cuota + cuota, 2);
				totalPorCategoria[cat.id_categoria].acumulado = round(totalPorCategoria[cat.id_categoria].acumulado + acumulado, 2);
				totalPorCategoria[cat.id_categoria].proyectado = round(totalPorCategoria[cat.id_categoria].proyectado + proyectado, 2);
			}
		});

		const totalCuotaVendedor = categorias.reduce((acc, cat) => round(acc + cat.cuota, 2), 0);
		const totalAcumuladoVendedor = categorias.reduce((acc, cat) => round(acc + cat.acumulado, 2), 0);
		const totalProyectadoVendedor = categorias.reduce((acc, cat) => round(acc + cat.proyectado, 2), 0);

		if (categorias.length > 0) {
			detalle.push({
				vendedor: {
					id_vendedor: vendedor.id_vendedor,
					codigo_vendedor: vendedor.codigo_vendedor,
					nombre: vendedor.nombre_vendedor
				},
				categorias: categorias,
				total_vendedor: {
					cuota: totalCuotaVendedor,
					acumulado: totalAcumuladoVendedor,
					porcentajeCumplimiento: totalCuotaVendedor > 0 ? (totalAcumuladoVendedor / totalCuotaVendedor) * 100 : 0,
					proyectado: totalProyectadoVendedor,
					porcentajeCumplimientoProyectado: totalCuotaVendedor > 0 ? (totalProyectadoVendedor / totalCuotaVendedor) * 100 : 0
				}
			});
		}
	});

	// Procesar totales por categoría
	const totalPorCategoriaArray = Object.values(totalPorCategoria).map((cat) => {
		const cuota = toNumber(cat.cuota);
		const acumulado = toNumber(cat.acumulado);
		const proyectado = toNumber(cat.proyectado);

		return {
			id_categoria: cat.id_categoria,
			categoria: cat.categoria,
			cuota: cuota,
			acumulado: acumulado,
			porcentajeCumplimiento: cuota > 0 ? (acumulado / cuota) * 100 : 0,
			proyectado: proyectado,
			porcentajeCumplimientoProyectado: cuota > 0 ? (proyectado / cuota) * 100 : 0
		};
	});

	// Totales generales
	const totalGeneralCuota = totalPorCategoriaArray.reduce((acc, cat) => round(acc + cat.cuota, 2), 0);
	const totalGeneralAcumulado = totalPorCategoriaArray.reduce((acc, cat) => round(acc + cat.acumulado, 2), 0);
	const totalGeneralProyectado = totalPorCategoriaArray.reduce((acc, cat) => round(acc + cat.proyectado, 2), 0);

	return {
		periodo: {
			fechaInicio: period.fechaInicio,
			fechaFin: period.fechaFin,
			dias_corridos: diasCorridos,
			dias_habiles: diasHabiles
		},
		detalle,
		totalPorCategoria: totalPorCategoriaArray,
		totalGeneral: {
			cuota: totalGeneralCuota,
			acumulado: totalGeneralAcumulado,
			porcentajeCumplimiento: totalGeneralCuota > 0 ? (totalGeneralAcumulado / totalGeneralCuota) * 100 : 0,
			proyectado: totalGeneralProyectado,
			porcentajeCumplimientoProyectado: totalGeneralCuota > 0 ? (totalGeneralProyectado / totalGeneralCuota) * 100 : 0
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
