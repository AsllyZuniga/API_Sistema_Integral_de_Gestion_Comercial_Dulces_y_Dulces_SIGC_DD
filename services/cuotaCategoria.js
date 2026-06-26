const { QueryTypes, Op } = require('sequelize');
const { sequelize, rango_dias_model, cuotaCategoria_model } = require('../models');
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

/**
 * Determina el alcance (scope) de visibilidad a partir del JWT.
 *
 *   - Sin auth o rol 1 (Admin)        → { tipo: 'all' }
 *   - rol 2 (Supervisor)             → { tipo: 'team', idsVendedor: [..] }
 *   - rol 3 (Vendedor)               → { tipo: 'self', idVendedor }
 *
 * El array devuelto por 'team' puede estar vacío si el supervisor no
 * tiene vendedores asignados (en ese caso el resultado será detalle=[]).
 *
 * @param {{idUsuario?: number, idVendedor?: number, rol?: number|string} | null | undefined} auth
 * @returns {Promise<{tipo: 'all'} | {tipo: 'team', idsVendedor: number[]}
 *   | {tipo: 'self', idVendedor: number | null}>}
 */
const getVendedorScopeFromAuth = async (auth) => {
	if (!auth) return { tipo: 'all' };

	const rol = Number(auth.rol);
	if (rol === 1) return { tipo: 'all' };

	if (rol === 2) {
		const equipo = await sequelize.query(`
			SELECT id_vendedor
			FROM vendedor
			WHERE id_supervisor = :idUsuario
			  AND id_vendedor IS NOT NULL
		`, {
			replacements: { idUsuario: auth.idUsuario },
			type: QueryTypes.SELECT
		});
		return { tipo: 'team', idsVendedor: equipo.map((v) => v.id_vendedor) };
	}

	// rol 3 (Vendedor) u otro: solo sus propios datos
	const ownVendedor = await sequelize.query(`
		SELECT id_vendedor FROM vendedor WHERE id_usuario = :idUsuario LIMIT 1
	`, {
		replacements: { idUsuario: auth.idUsuario },
		type: QueryTypes.SELECT,
		plain: true
	});
	return { tipo: 'self', idVendedor: ownVendedor?.id_vendedor ?? null };
};

/**
 * Construye los placeholders y el fragmento SQL para filtrar por scope.
 *
 *   - tipo 'all'  → sin filtro (devuelve '')
 *   - tipo 'team' → 'AND vcc.id_vendedor IN (:scope0, :scope1, ...)'
 *   - tipo 'self' → 'AND vcc.id_vendedor = :scope0'   (o vacío si null)
 *
 * Los bindings se agregan a `replacements` bajo las claves scope0..scopeN.
 *
 * @param {{tipo: 'all'|'team'|'self', idsVendedor?: number[], idVendedor?: number|null}} scope
 * @param {string} column nombre de la columna a filtrar (default 'vcc.id_vendedor')
 * @param {object} [replacements={}] objeto al que se agregan los bindings
 * @returns {string} fragmento SQL (puede empezar con ' AND ...' o ser vacío)
 */
const buildScopeWhere = (scope, column = 'vcc.id_vendedor', replacements = {}) => {
	if (scope.tipo === 'all') return '';
	if (scope.tipo === 'team') {
		if (!scope.idsVendedor || scope.idsVendedor.length === 0) {
			// Equipo vacío: forzar resultado vacío
			return ` AND ${column} = -1`;
		}
		const placeholders = scope.idsVendedor
			.map((_, i) => `:scopeV${i}`)
			.join(',');
		scope.idsVendedor.forEach((id, i) => { replacements[`scopeV${i}`] = id; });
		return ` AND ${column} IN (${placeholders})`;
	}
	if (scope.tipo === 'self') {
		if (!scope.idVendedor) {
			return ` AND ${column} = -1`;
		}
		replacements.scopeV0 = scope.idVendedor;
		return ` AND ${column} = :scopeV0`;
	}
	return '';
};

const buildScopeWhereVentas = (scope, column = 'v.id_vendedor', replacements = {}) => {
	if (scope.tipo === 'all') return '';
	if (scope.tipo === 'team') {
		if (!scope.idsVendedor || scope.idsVendedor.length === 0) {
			return ` AND ${column} = -1`;
		}
		const placeholders = scope.idsVendedor
			.map((_, i) => `:scopeVV${i}`)
			.join(',');
		scope.idsVendedor.forEach((id, i) => { replacements[`scopeVV${i}`] = id; });
		return ` AND ${column} IN (${placeholders})`;
	}
	if (scope.tipo === 'self') {
		if (!scope.idVendedor) return ` AND ${column} = -1`;
		replacements.scopeVV0 = scope.idVendedor;
		return ` AND ${column} = :scopeVV0`;
	}
	return '';
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

/**
 * Cumplimiento de cuotas por categoría para el período, con filtrado
 * automático por rol a partir del JWT.
 *
 *   - Admin (rol 1)         → todas las categorías de todos los vendedores
 *   - Supervisor (rol 2)    → categorías de su equipo (vendedor.id_supervisor)
 *   - Vendedor (rol 3)      → solo sus categorías
 *
 * Si no se pasan fechas en filters, se usa el mes actual.
 *
 * @param {object} [filters={}] fechaInicio, fechaFin
 * @param {{idUsuario?: number, idVendedor?: number, rol?: number|string} | null} [auth=null]
 * @returns {Promise<{detalle: Array, total: object, periodo: object, scope?: object}>}
 */
const getCuotaCategoriaGeneral = async (filters = {}, auth = null) => {
	const period = normalizePeriodFilters(filters);
	const scope = await getVendedorScopeFromAuth(auth);
	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin
	};

	// Filtros SQL derivados del scope
	const scopeWhereCuotas = buildScopeWhere(scope, 'vcc.id_vendedor', replacements);
	const scopeWhereVentas = buildScopeWhereVentas(scope, 'v.id_vendedor', replacements);

	// PARTE 1: Categorías CON cuota (filtradas por scope)
	// CAST ::date porque vcc.fecha_inicio/fin son timestamp with time zone
	// y los replacements llegan como texto plano (PG no hace cast implícito
	// en prepared statements).
	const cuotasPorCategoria = await sequelize.query(`
		SELECT
			vcc.id_categoria,
			cat.nombre AS categoria,
			SUM(vcc.cuota) AS cuota
		FROM vendedor_cuota_categoria vcc
		JOIN categoria cat ON cat.id_categoria = vcc.id_categoria
		WHERE vcc.fecha_inicio <= :fechaFin::date
		  AND vcc.fecha_fin >= :fechaInicio::date
		  ${scopeWhereCuotas}
		GROUP BY vcc.id_categoria, cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// PARTE 2: Acumulado de ventas (filtrado por scope)
	const acumuladoPorCategoria = await sequelize.query(`
		SELECT
			it.id_categoria,
			cat.nombre AS categoria,
			SUM(COALESCE(dv.subtotal, 0)) AS acumulado
		FROM detalle_venta dv
		JOIN item it ON it.id_item = dv.id_item
		JOIN venta v ON v.id_venta = dv.id_venta
		JOIN categoria cat ON cat.id_categoria = it.id_categoria
		WHERE v.fecha >= :fechaInicio
		  AND v.fecha <= :fechaFin
		  ${scopeWhereVentas}
		GROUP BY it.id_categoria, cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Crear índices para búsqueda rápida
	const cuotaIndex = new Map();
	cuotasPorCategoria.forEach((r) => {
		cuotaIndex.set(Number(r.id_categoria), { categoria: r.categoria, cuota: toNumber(r.cuota) });
	});

	const acumuladoIndex = new Map();
	acumuladoPorCategoria.forEach((r) => {
		acumuladoIndex.set(Number(r.id_categoria), { categoria: r.categoria, acumulado: toNumber(r.acumulado) });
	});

	// UNIÓN: Todas las categorías (cuota + sin cuota con venta)
	const todasIds = new Set([...cuotaIndex.keys(), ...acumuladoIndex.keys()]);

	const rows = Array.from(todasIds).map((idCategoria) => {
		const cuotaData = cuotaIndex.get(idCategoria);
		const acumData = acumuladoIndex.get(idCategoria);
		return {
			id_categoria: idCategoria,
			categoria: cuotaData?.categoria || acumData?.categoria || `Categoría ${idCategoria}`,
			cuota: cuotaData?.cuota || 0,
			acumulado: acumData?.acumulado || 0
		};
	}).sort((a, b) => a.categoria.localeCompare(b.categoria));

	const payload = await buildCuotaCategoriaPayload(rows, period);

	// Devolver el scope para que el front sepa qué se le está mostrando
	return { ...payload, scope: { tipo: scope.tipo } };
};

/**
 * Cumplimiento de cuotas por categoría para UN vendedor en el período.
 * Devuelve null si el vendedor no existe.
 *
 * @param {string} codigoVendedor
 * @param {object} [filters={}] fechaInicio, fechaFin
 * @returns {Promise<null | {detalle: Array, total: object, periodo: object,
 *   vendedor: object}>}
 */
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

	// Cuotas por categoría desde tabla real
	const cuotasPorCategoria = await sequelize.query(`
		SELECT
			vcc.id_categoria,
			cat.nombre AS categoria,
			SUM(vcc.cuota) AS cuota
		FROM vendedor_cuota_categoria vcc
		JOIN categoria cat ON cat.id_categoria = vcc.id_categoria
		WHERE vcc.id_vendedor = :idVendedor
		  AND vcc.fecha_inicio <= :fechaFin
		  AND vcc.fecha_fin >= :fechaInicio
		GROUP BY vcc.id_categoria, cat.nombre
		ORDER BY cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// Acumulado de ventas por categoría (todas, sin filtrar por cuota)
	const acumuladoPorCategoria = await sequelize.query(`
		SELECT
			it.id_categoria,
			cat.nombre AS categoria,
			SUM(COALESCE(dv.subtotal, 0)) AS acumulado
		FROM detalle_venta dv
		JOIN item it ON it.id_item = dv.id_item
		JOIN venta v ON v.id_venta = dv.id_venta
		JOIN categoria cat ON cat.id_categoria = it.id_categoria
		WHERE v.fecha >= :fechaInicio
		  AND v.fecha <= :fechaFin
		  AND v.id_vendedor = :idVendedor
		GROUP BY it.id_categoria, cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	if (cuotasPorCategoria.length === 0 && acumuladoPorCategoria.length === 0) return null;

	// Unir cuotas y acumulados por id_categoria
	const cuotaIndex = new Map();
	cuotasPorCategoria.forEach((r) => {
		cuotaIndex.set(Number(r.id_categoria), { categoria: r.categoria, cuota: toNumber(r.cuota) });
	});

	const acumuladoIndex = new Map();
	acumuladoPorCategoria.forEach((r) => {
		acumuladoIndex.set(Number(r.id_categoria), { categoria: r.categoria, acumulado: toNumber(r.acumulado) });
	});

	// Unión de todos los id_categoria presentes en cuotas o ventas
	const todasIds = new Set([...cuotaIndex.keys(), ...acumuladoIndex.keys()]);

	const rows = Array.from(todasIds).map((idCategoria) => {
		const cuotaData = cuotaIndex.get(idCategoria);
		const acumData = acumuladoIndex.get(idCategoria);
		return {
			id_categoria: idCategoria,
			categoria: cuotaData?.categoria || acumData?.categoria || `Categoría ${idCategoria}`,
			cuota: cuotaData?.cuota || 0,
			acumulado: acumData?.acumulado || 0
		};
	}).sort((a, b) => a.categoria.localeCompare(b.categoria));

	return buildCuotaCategoriaPayload(rows, period, {
		vendedor: {
			id_vendedor: vendedor.id_vendedor,
			codigo_vendedor: vendedor.codigo_vendedor,
			nombre: vendedor.nombre
		}
	});
};

/**
 * Cumplimiento de cuotas por categoría para TODOS los vendedores
 * en el período, agrupado por vendedor + categoría. Pensado para
 * reportes de cobertura.
 *
 * @param {object} [filters={}] fechaInicio, fechaFin
 * @returns {Promise<{detalle: Array, totalesGenerales: object,
 *   periodo: object}>}
 */
const getCuotaCategoriaTodosVendedores = async (filters = {}) => {
	const period = normalizePeriodFilters(filters);
	const replacements = {
		fechaInicio: period.fechaInicio,
		fechaFin: period.fechaFin
	};

	// PARTE 1: Vendedores con cuotas por categoría
	const cuotasPorVendedorCategoria = await sequelize.query(`
		SELECT
			vcc.id_vendedor,
			v.codigo_vendedor,
			v.nombre AS nombre_vendedor,
			vcc.id_categoria,
			cat.nombre AS categoria,
			SUM(vcc.cuota) AS cuota
		FROM vendedor_cuota_categoria vcc
		JOIN vendedor v ON v.id_vendedor = vcc.id_vendedor
		JOIN categoria cat ON cat.id_categoria = vcc.id_categoria
		WHERE vcc.fecha_inicio <= :fechaFin
		  AND vcc.fecha_fin >= :fechaInicio
		GROUP BY vcc.id_vendedor, v.codigo_vendedor, v.nombre, vcc.id_categoria, cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	// PARTE 2: Acumulado de ventas por vendedor y categoría (TODO, sin filtro por cuota)
	const acumuladoRows = await sequelize.query(`
		SELECT
			v.id_vendedor,
			it.id_categoria,
			cat.nombre AS categoria,
			SUM(COALESCE(dv.subtotal, 0)) AS acumulado
		FROM detalle_venta dv
		JOIN item it ON it.id_item = dv.id_item
		JOIN venta v ON v.id_venta = dv.id_venta
		JOIN categoria cat ON cat.id_categoria = it.id_categoria
		WHERE v.fecha >= :fechaInicio
		  AND v.fecha <= :fechaFin
		GROUP BY v.id_vendedor, it.id_categoria, cat.nombre
	`, {
		replacements,
		type: QueryTypes.SELECT
	});

	if (cuotasPorVendedorCategoria.length === 0 && acumuladoRows.length === 0) {
		return { 
			periodo: { fechaInicio: period.fechaInicio, fechaFin: period.fechaFin }, 
			detalle: [], 
			totalPorCategoria: [], 
			totalGeneral: { cuota: 0, acumulado: 0, porcentajeCumplimiento: 0, proyectado: 0, porcentajeCumplimientoProyectado: 0 } 
		};
	}

	// Índices para búsqueda rápida
	const cuotaIndex = new Map();
	const vendedoresSet = new Set();
	cuotasPorVendedorCategoria.forEach((row) => {
		cuotaIndex.set(`${row.id_vendedor}_${row.id_categoria}`, {
			id_vendedor: row.id_vendedor,
			codigo_vendedor: row.codigo_vendedor,
			nombre_vendedor: row.nombre_vendedor,
			id_categoria: row.id_categoria,
			categoria: row.categoria,
			cuota: toNumber(row.cuota)
		});
		vendedoresSet.add(row.id_vendedor);
	});

	const acumuladoIndex = new Map();
	acumuladoRows.forEach((r) => {
		acumuladoIndex.set(`${r.id_vendedor}_${r.id_categoria}`, toNumber(r.acumulado));
		vendedoresSet.add(r.id_vendedor);
	});

	// Obtener info de vendedores adicionales que solo tienen venta sin cuota
	const vendedoresIds = Array.from(vendedoresSet);
	const vendedoresAdicionalesIds = vendedoresIds.filter(id => {
		for (let i = 0; i < cuotasPorVendedorCategoria.length; i++) {
			if (cuotasPorVendedorCategoria[i].id_vendedor === id) return false;
		}
		return true;
	});

	const vendedoresInfo = new Map();
	if (vendedoresAdicionalesIds.length > 0) {
		const placeholders = vendedoresAdicionalesIds.map((_, i) => `:vendId${i}`).join(',');
		const vendReplacements = {};
		vendedoresAdicionalesIds.forEach((id, i) => { vendReplacements[`vendId${i}`] = id; });

		const vendedoresRows = await sequelize.query(`
			SELECT id_vendedor, codigo_vendedor, nombre
			FROM vendedor
			WHERE id_vendedor IN (${placeholders})
		`, {
			replacements: vendReplacements,
			type: QueryTypes.SELECT
		});

		vendedoresRows.forEach((v) => {
			vendedoresInfo.set(v.id_vendedor, { codigo_vendedor: v.codigo_vendedor, nombre: v.nombre });
		});
	}

	// Agrupar por vendedor, combinando cuotas y acumulados
	const vendedoresMap = new Map();

	// Procesar cuotas (esto asegura que todos los vendedores con cuota estén presentes)
	cuotasPorVendedorCategoria.forEach((row) => {
		const vendorKey = row.id_vendedor;
		if (!vendedoresMap.has(vendorKey)) {
			vendedoresMap.set(vendorKey, {
				id_vendedor: row.id_vendedor,
				codigo_vendedor: row.codigo_vendedor,
				nombre_vendedor: row.nombre_vendedor,
				categorias: []
			});
		}
		const vendedor = vendedoresMap.get(vendorKey);
		const acumulado = acumuladoIndex.get(`${row.id_vendedor}_${row.id_categoria}`) || 0;
		vendedor.categorias.push({
			id_categoria: Number(row.id_categoria),
			categoria: row.categoria,
			cuota: row.cuota,
			acumulado
		});
	});

	// Procesar acumulados de categorías sin cuota
	acumuladoRows.forEach((row) => {
		const vendorKey = row.id_vendedor;
		const catKey = Number(row.id_categoria);
		
		// Verificar si esta combinación ya existe en cuotas
		const existe = cuotasPorVendedorCategoria.some(q => q.id_vendedor === vendorKey && q.id_categoria === catKey);
		if (!existe) {
			if (!vendedoresMap.has(vendorKey)) {
				const vendInfo = vendedoresInfo.get(vendorKey);
				vendedoresMap.set(vendorKey, {
					id_vendedor: vendorKey,
					codigo_vendedor: vendInfo?.codigo_vendedor || `VEN_${vendorKey}`,
					nombre_vendedor: vendInfo?.nombre || `Vendedor ${vendorKey}`,
					categorias: []
				});
			}
			vendedoresMap.get(vendorKey).categorias.push({
				id_categoria: catKey,
				categoria: row.categoria,
				cuota: 0,
				acumulado: toNumber(row.acumulado)
			});
		}
	});

	const { diasCorridos, diasHabiles } = await getRangoDias(period.fechaInicio, period.fechaFin);

	// Enriquecer datos con cálculos
	const totalPorCategoria = new Map();
	const detalle = [];

	vendedoresMap.forEach((vendedor) => {
		const categoriesEnriquecidas = vendedor.categorias.map((c) => {
			const cuota = toNumber(c.cuota);
			const acumulado = toNumber(c.acumulado);
			const proyectado = diasCorridos > 0 ? (acumulado / diasCorridos) * diasHabiles : 0;
			return {
				id_categoria: c.id_categoria,
				categoria: c.categoria,
				cuota,
				acumulado,
				porcentajeCumplimiento: round(cuota > 0 ? (acumulado / cuota) * 100 : 0, 2),
				proyectado: round(proyectado, 2),
				porcentajeCumplimientoProyectado: round(cuota > 0 ? (proyectado / cuota) * 100 : 0, 2)
			};
		});

		const totalCuota = categoriesEnriquecidas.reduce((acc, c) => round(acc + c.cuota, 2), 0);
		const totalAcumulado = categoriesEnriquecidas.reduce((acc, c) => round(acc + c.acumulado, 2), 0);
		const totalProyectado = categoriesEnriquecidas.reduce((acc, c) => round(acc + c.proyectado, 2), 0);

		detalle.push({
			vendedor: { 
				id_vendedor: vendedor.id_vendedor, 
				codigo_vendedor: vendedor.codigo_vendedor, 
				nombre: vendedor.nombre_vendedor 
			},
			categorias: categoriesEnriquecidas,
			total_vendedor: {
				cuota: totalCuota,
				acumulado: totalAcumulado,
				porcentajeCumplimiento: totalCuota > 0 ? round((totalAcumulado / totalCuota) * 100, 2) : 0,
				proyectado: totalProyectado,
				porcentajeCumplimientoProyectado: totalCuota > 0 ? round((totalProyectado / totalCuota) * 100, 2) : 0
			}
		});

		// Agregar a totales por categoría
		categoriesEnriquecidas.forEach((cat) => {
			if (!totalPorCategoria.has(cat.id_categoria)) {
				totalPorCategoria.set(cat.id_categoria, { 
					id_categoria: cat.id_categoria, 
					categoria: cat.categoria, 
					cuota: 0, 
					acumulado: 0, 
					proyectado: 0 
				});
			}
			const t = totalPorCategoria.get(cat.id_categoria);
			t.cuota = round(t.cuota + cat.cuota, 2);
			t.acumulado = round(t.acumulado + cat.acumulado, 2);
			t.proyectado = round(t.proyectado + cat.proyectado, 2);
		});
	});

	const totalPorCategoriaArray = Array.from(totalPorCategoria.values()).map((cat) => ({
		...cat,
		porcentajeCumplimiento: cat.cuota > 0 ? round((cat.acumulado / cat.cuota) * 100, 2) : 0,
		porcentajeCumplimientoProyectado: cat.cuota > 0 ? round((cat.proyectado / cat.cuota) * 100, 2) : 0
	}));

	const totalGeneralCuota = totalPorCategoriaArray.reduce((acc, c) => round(acc + c.cuota, 2), 0);
	const totalGeneralAcumulado = totalPorCategoriaArray.reduce((acc, c) => round(acc + c.acumulado, 2), 0);
	const totalGeneralProyectado = totalPorCategoriaArray.reduce((acc, c) => round(acc + c.proyectado, 2), 0);

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
			porcentajeCumplimiento: totalGeneralCuota > 0 ? round((totalGeneralAcumulado / totalGeneralCuota) * 100, 2) : 0,
			proyectado: totalGeneralProyectado,
			porcentajeCumplimientoProyectado: totalGeneralCuota > 0 ? round((totalGeneralProyectado / totalGeneralCuota) * 100, 2) : 0
		}
	};
};

/**
 * Valida la integridad de las cuotas por categoría y vendedor en un
 * período. Útil para detectar cuotas faltantes o en cero antes de
 * generar reportes de cumplimiento.
 *
 * @param {string} [fechaInicio='2026-03-01'] YYYY-MM-DD
 * @param {string} [fechaFin='2026-03-31'] YYYY-MM-DD
 * @returns {Promise<{errores: Array, resumen: object}>}
 */
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

/**
 * Compara las cuotas recibidas desde un CSV contra las existentes
 * en BD para el período. Devuelve coincidencias y discrepancias
 * con su porcentaje de integridad.
 *
 * @param {Array<{codigo_vendedor: string, categoria: string,
 *   cuota: number}>} datosCSV cuotas parseadas del CSV
 * @param {string} [fechaInicio='2026-03-01'] YYYY-MM-DD
 * @returns {Promise<{total_coincidencias: number,
 *   total_discrepancias: number, coincidencias: Array,
 *   discrepancias: Array, porcentaje_integridad: number|string}>}
 *   En caso de error: { error: true, mensaje: string }
 */
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

/**
 * Elimina una cuota de categoría por su id.
 *
 * @param {number|string} id id_cuotaCategoria
 * @returns {Promise<number>} filas afectadas
 * @throws {Error} 'Cuota de categoría no encontrada' si el id no existe
 */
const deleteById = async (id) => {
	const row = await cuotaCategoria_model.findByPk(id);
	if (!row) throw new Error('Cuota de categoría no encontrada');
	return await row.destroy();
};

/**
 * Elimina cuotas de categoría cuyo rango de vigencia se solape con
 * [fechaInicio, fechaFin] (ambos inclusive).
 *
 * @param {string} fechaInicio YYYY-MM-DD
 * @param {string} fechaFin YYYY-MM-DD
 * @returns {Promise<{deletedCount: number, message: string}>}
 * @throws {Error} si falta fechaInicio o fechaFin
 */
const deleteByDateRange = async (fechaInicio, fechaFin) => {
	if (!fechaInicio || !fechaFin) {
		throw new Error('Se requieren fechaInicio y fechaFin (YYYY-MM-DD)');
	}
	
	const { Op } = require('sequelize');
	
	// Convertir a ISO format para comparación correcta con BD
	const inicioISO = `${fechaInicio}T00:00:00.000Z`;
	const finISO = `${fechaFin}T23:59:59.999Z`;
	
	const deletedCount = await cuotaCategoria_model.destroy({
		where: {
			[Op.and]: [
				{ fecha_inicio: { [Op.gte]: inicioISO } },
				{ fecha_fin: { [Op.lte]: finISO } }
			]
		}
	});
	
	return { deletedCount, message: `${deletedCount} cuotas de categoría eliminadas` };
};

module.exports = {
	// Endpoint público único, role-aware desde JWT
	getCuotaCategoriaGeneral,
	// Mantener por compatibilidad con el script de validación interna
	// (NO se expone en routes/cuotaCategoriaRouter.js)
	getCuotaCategoriaPorVendedor,
	// Herramientas internas (no expuestas en router)
	validateCuotasMarzo,
	compareCuotasCSVvsBD,
	deleteById,
	deleteByDateRange
};
