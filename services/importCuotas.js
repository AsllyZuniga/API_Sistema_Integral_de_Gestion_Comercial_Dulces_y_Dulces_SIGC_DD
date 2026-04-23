"use strict";

const fs = require('fs');
const { Op } = require('sequelize');
const models = require('../models');

const MONTH_BY_NAME = {
	enero: 0,
	febrero: 1,
	febero: 1,
	mar: 2,
	marzo: 2,
	abril: 3,
	mayo: 4,
	junio: 5,
	julio: 6,
	agosto: 7,
	septiembre: 8,
	setiembre: 8,
	oct: 9,
	octubre: 9,
	noviembre: 10,
	diciembre: 11
};

function normalizeText(value) {
	return String(value ?? '')
		.replace(/^\uFEFF/, '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function detectDelimiter(headerLine) {
	if (headerLine.includes('\t')) return '\t';
	if (headerLine.includes(';')) return ';';
	if (headerLine.includes('|')) return '|';
	return ',';
}

function splitCsvLine(line, delimiter) {
	const cells = [];
	let current = '';
	let inQuotes = false;

	for (let index = 0; index < line.length; index++) {
		const char = line[index];

		if (char === '"') {
			const nextChar = line[index + 1];
			if (inQuotes && nextChar === '"') {
				current += '"';
				index++;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (!inQuotes && char === delimiter) {
			cells.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	cells.push(current.trim());
	return cells;
}

function parseCsv(content) {
	const lines = content
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.split('\n')
		.filter(line => line.trim().length > 0);

	if (lines.length < 2) {
		throw new Error('El archivo debe contener encabezado y al menos una fila de datos.');
	}

	const delimiter = detectDelimiter(lines[0]);
	const headers = splitCsvLine(lines[0], delimiter).map(header => header.trim());

	const rows = lines.slice(1).map(line => {
		const cells = splitCsvLine(line, delimiter);
		const row = {};
		headers.forEach((header, columnIndex) => {
			row[header] = (cells[columnIndex] ?? '').trim();
		});
		return row;
	});

	return { headers, rows };
}

function findHeaderByAliases(headers, aliases) {
	const headersByNormalized = new Map(
		headers.map(header => [normalizeText(header), header])
	);

	for (const alias of aliases) {
		const found = headersByNormalized.get(normalizeText(alias));
		if (found) return found;
	}

	return null;
}

function parseAmount(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return null;

	const normalized = raw
		.replace(/\s+/g, '')
		.replace(/\./g, '')
		.replace(',', '.');

	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return null;

	return Math.round(parsed);
}

function formatDate(year, month, day) {
	const date = new Date(Date.UTC(year, month, day));
	return date.toISOString().slice(0, 10);
}

function getLastDayOfMonth(year, month) {
	return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function resolveMonthIndex(monthRaw) {
	const normalized = normalizeText(monthRaw).replace(/[^a-z]/g, '');
	if (!normalized) return null;

	if (MONTH_BY_NAME[normalized] !== undefined) {
		return MONTH_BY_NAME[normalized];
	}

	const short = normalized.slice(0, 3);
	const key = Object.keys(MONTH_BY_NAME).find(month => month.startsWith(short));
	return key ? MONTH_BY_NAME[key] : null;
}

function parseWeekHeader(header) {
	const normalized = normalizeText(header);
	const regex = /(\d{1,2})\s*(?:al|a|-)\s*(\d{1,2})\s*(?:de)?\s*([a-zñáéíóú]+)/i;
	const match = normalized.match(regex);

	if (!match) return null;

	const dayStart = Number(match[1]);
	const dayEnd = Number(match[2]);
	const monthIndex = resolveMonthIndex(match[3]);

	if (!Number.isInteger(dayStart) || !Number.isInteger(dayEnd) || monthIndex === null) {
		return null;
	}

	return {
		header,
		dayStart,
		dayEnd,
		monthIndex
	};
}

function extractWeekColumns(headers) {
	return headers
		.map(parseWeekHeader)
		.filter(Boolean)
		.sort((left, right) => {
			if (left.monthIndex !== right.monthIndex) return left.monthIndex - right.monthIndex;
			return left.dayStart - right.dayStart;
		});
}

function resolveYear(weekColumns, optionsYear) {
	const parsedYear = Number(optionsYear);
	if (Number.isInteger(parsedYear) && parsedYear > 1900 && parsedYear < 3000) {
		return parsedYear;
	}

	const currentYear = new Date().getFullYear();
	if (!weekColumns.length) return currentYear;

	return currentYear;
}

/**
 * Detecta el mes más frecuente en las columnas de semana
 * Usa el mes que aparece más veces, para manejar CSVs con múltiples meses
 */
function detectMostFrequentMonth(weekColumns) {
	if (!weekColumns.length) return null;

	const monthCounts = new Map();
	for (const weekCol of weekColumns) {
		const count = monthCounts.get(weekCol.monthIndex) || 0;
		monthCounts.set(weekCol.monthIndex, count + 1);
	}

	let mostFrequent = null;
	let maxCount = 0;

	for (const [monthIndex, count] of monthCounts) {
		if (count > maxCount) {
			maxCount = count;
			mostFrequent = monthIndex;
		}
	}

	return mostFrequent;
}

async function upsertCuotaDia(payload, transaction) {
	const existing = await models.cuotaDia_model.findOne({
		where: {
			id_usuario: payload.id_usuario,
			fecha_inicio: payload.fecha_inicio,
			fecha_fin: payload.fecha_fin
		},
		transaction
	});

	if (existing) {
		await existing.update(
			{ cuota_dia: payload.cuota_dia },
			{ transaction }
		);
		return existing;
	}

	return models.cuotaDia_model.create(payload, { transaction });
}

async function upsertCuotaSemana(payload, transaction) {
	const existing = await models.cuotaSemana_model.findOne({
		where: {
			id_usuario: payload.id_usuario,
			fecha_inicio: payload.fecha_inicio,
			fecha_fin: payload.fecha_fin
		},
		transaction
	});

	if (existing) {
		await existing.update(
			{ cuota_semana: payload.cuota_semana },
			{ transaction }
		);
		return existing;
	}

	return models.cuotaSemana_model.create(payload, { transaction });
}

async function upsertCuotaMes(payload, transaction) {
	const existing = await models.cuotaMes_model.findOne({
		where: {
			id_usuario: payload.id_usuario,
			fecha_inicio: payload.fecha_inicio,
			fecha_fin: payload.fecha_fin
		},
		transaction
	});

	if (existing) {
		await existing.update(
			{ cuota_mes: payload.cuota_mes },
			{ transaction }
		);
		return existing;
	}

	return models.cuotaMes_model.create(payload, { transaction });
}

async function importFromBuffer(fileContent, options = {}) {
	const content = Buffer.isBuffer(fileContent)
		? fileContent.toString('utf8')
		: String(fileContent ?? '');

	const { headers, rows } = parseCsv(content);

	const headerCodigo = findHeaderByAliases(headers, ['cod', 'codigo', 'codigo_vendedor']);
	const headerNombre = findHeaderByAliases(headers, ['vendedor', 'nombre', 'nombre_vendedor']);
	const headerCuotaDia = findHeaderByAliases(headers, ['c. diaria', 'c diaria', 'cuota diaria']);
	const headerCuotaMes = findHeaderByAliases(headers, ['cuota mes', 'cuota mensual']);

	if (!headerCodigo) {
		throw new Error('No se encontró el encabezado de código (cod/codigo/codigo_vendedor).');
	}
	if (!headerCuotaDia) {
		throw new Error('No se encontró el encabezado de cuota diaria (C. DIARIA).');
	}
	if (!headerCuotaMes) {
		throw new Error('No se encontró el encabezado de cuota mensual (CUOTA MES).');
	}

	const weekColumns = extractWeekColumns(headers);
	if (weekColumns.length === 0) {
		throw new Error('No se identificaron columnas de cuota semanal con formato "2 al 6 de febrero".');
	}

	const year = resolveYear(weekColumns, options.year);

	// Permitir override del mes si se proporciona en options
	// Si no se proporciona, detectar el mes más frecuente en las columnas
	let mainMonth = options.mes !== undefined ? null : detectMostFrequentMonth(weekColumns);
	
	if (options.mes !== undefined) {
		if (typeof options.mes === 'string') {
			mainMonth = resolveMonthIndex(options.mes);
			if (mainMonth === null) {
				throw new Error(`Mes inválido: "${options.mes}". Usa nombres en español (ej: "abril", "marzo")`);
			}
		} else if (typeof options.mes === 'number') {
			mainMonth = options.mes;
			if (!Number.isInteger(mainMonth) || mainMonth < 0 || mainMonth > 11) {
				throw new Error(`Mes debe ser un número entre 0 (enero) y 11 (diciembre)`);
			}
		}
	}

	// Fallback si no hay mes detectado
	if (mainMonth === null) {
		mainMonth = weekColumns[0].monthIndex;
	}

	const monthStart = formatDate(year, mainMonth, 1);
	const monthEnd = formatDate(year, mainMonth, getLastDayOfMonth(year, mainMonth));

	const codes = [...new Set(rows
		.map(row => String(row[headerCodigo] ?? '').trim())
		.filter(Boolean))];

	const existingVendedores = await models.vendedor_model.findAll({
		where: { codigo_vendedor: codes },
		attributes: ['id_vendedor', 'codigo_vendedor', 'nombre', 'id_usuario']
	});

	const existingUsuarios = await models.usuario_model.findAll({
		where: {
			username: {
				[Op.in]: codes
			}
		},
		attributes: ['id_usuario', 'username']
	});

	const usuarioIdByCodigo = new Map(
		existingUsuarios.map(usuario => [String(usuario.username).trim(), usuario.id_usuario])
	);

	const vendedorByCode = new Map(
		existingVendedores.map(vendedor => [String(vendedor.codigo_vendedor).trim(), vendedor])
	);

	const summary = {
		year,
		month_start: monthStart,
		month_end: monthEnd,
		rows_total: rows.length,
		rows_processed: 0,
		vendedores_creados: 0,
		vendedores_existentes: existingVendedores.length,
		usuarios_encontrados_por_codigo: existingUsuarios.length,
		cuota_dia_upserts: 0,
		cuota_semana_upserts: 0,
		cuota_mes_upserts: 0,
		errores: []
	};

	for (const row of rows) {
		const codigo = String(row[headerCodigo] ?? '').trim();
		if (!codigo) continue;

		const nombre = String(row[headerNombre] ?? '').trim() || `VENDEDOR ${codigo}`;
		const idUsuarioFromCodigo = usuarioIdByCodigo.get(codigo) ?? null;

		if (!idUsuarioFromCodigo) {
			summary.errores.push({
				codigo_vendedor: codigo,
				motivo: 'No existe usuario con username igual al código del vendedor; no se pueden registrar cuotas.'
			});
			continue;
		}

		let vendedor = vendedorByCode.get(codigo);
		if (!vendedor) {
			vendedor = await models.vendedor_model.create({
				codigo_vendedor: codigo,
				nombre,
				id_usuario: idUsuarioFromCodigo
			});
			vendedorByCode.set(codigo, vendedor);
			summary.vendedores_creados += 1;
		} else if (Number(vendedor.id_usuario) !== Number(idUsuarioFromCodigo)) {
			await vendedor.update({ id_usuario: idUsuarioFromCodigo });
			vendedor.id_usuario = idUsuarioFromCodigo;
		}

		summary.rows_processed += 1;

		try {
			await models.sequelize.transaction(async (transaction) => {
				const cuotaDiaValue = parseAmount(row[headerCuotaDia]);
				const cuotaMesValue = parseAmount(row[headerCuotaMes]);

				let cuotaDia = null;
				if (cuotaDiaValue !== null) {
					cuotaDia = await upsertCuotaDia({
						cuota_dia: cuotaDiaValue,
						fecha_inicio: monthStart,
						fecha_fin: monthEnd,
						id_usuario: idUsuarioFromCodigo
					}, transaction);
					summary.cuota_dia_upserts += 1;
				}

				let lastCuotaSemana = null;
				for (const weekColumn of weekColumns) {
					const weekAmount = parseAmount(row[weekColumn.header]);
					if (weekAmount === null) continue;

					const fechaInicio = formatDate(year, weekColumn.monthIndex, weekColumn.dayStart);
					const fechaFin = formatDate(year, weekColumn.monthIndex, weekColumn.dayEnd);

					lastCuotaSemana = await upsertCuotaSemana({
						cuota_semana: weekAmount,
						fecha_inicio: fechaInicio,
						fecha_fin: fechaFin,
						id_usuario: idUsuarioFromCodigo
					}, transaction);

					summary.cuota_semana_upserts += 1;
				}

				let cuotaMes = null;
				if (cuotaMesValue !== null) {
					cuotaMes = await upsertCuotaMes({
						cuota_mes: cuotaMesValue,
						fecha_inicio: monthStart,
						fecha_fin: monthEnd,
						id_usuario: idUsuarioFromCodigo
					}, transaction);
					summary.cuota_mes_upserts += 1;
				}

				await vendedor.update({
					id_usuario: idUsuarioFromCodigo,
					id_cuotaDia: cuotaDia?.id_cuotaDia ?? vendedor.id_cuotaDia,
					id_cuotaSemana: lastCuotaSemana?.id_cuotaSemana ?? vendedor.id_cuotaSemana,
					id_cuotaMes: cuotaMes?.id_cuotaMes ?? vendedor.id_cuotaMes,
					nombre
				}, { transaction });
			});
		} catch (error) {
			summary.errores.push({
				codigo_vendedor: codigo,
				motivo: error.message
			});
		}
	}

	return summary;
}

async function importFromFile(filePath, options = {}) {
	if (!filePath) {
		throw new Error('Debe enviar la ruta del archivo CSV.');
	}

	const content = fs.readFileSync(filePath, 'utf8');
	return importFromBuffer(content, options);
}

module.exports = {
	importFromBuffer,
	importFromFile
};

