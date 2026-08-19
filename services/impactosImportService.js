'use strict';

const fs = require('fs');
const iconv = require('iconv-lite');
const { QueryTypes, Op } = require('sequelize');
const models = require('../models');
const { sequelize } = models;

const BULK_CHUNK_SIZE = 2000;

// ── Utilidades genéricas ──────────────────────────────────────────────────────

function chunkArray(items, chunkSize) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const chunks = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}

function normalizeText(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function normalizeProveedorName(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function normalizeCompact(value) {
    return normalizeProveedorName(value).replace(/\s+/g, '');
}

function normalizeVendedorCode(value) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(Number(raw));
    return raw.toUpperCase();
}

function formatVendedorCode(value) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(Number(raw)).padStart(4, '0');
    return raw;
}

function decodeContent(input) {
    const buffer = Buffer.isBuffer(input)
        ? input
        : Buffer.from(String(input ?? ''), 'utf8');

    let decoded = buffer.toString('utf8');

    if (decoded.includes('\uFFFD')) {
        decoded = iconv.decode(buffer, 'latin1');
    }

    return decoded.replace(/^\uFEFF/, '');
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

function isValidYear(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 1900 && parsed < 3000;
}

function isIsoDate(value) {
    const raw = String(value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    const date = new Date(`${raw}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function parseAmount(value) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    if (!raw || raw === '-') return null;

    const normalized = raw
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;

    return Math.round(parsed);
}

function isSinCuota(value) {
    const parsed = parseAmount(value);
    return parsed === null || parsed === 0;
}

function formatDate(year, month, day) {
    const date = new Date(Date.UTC(year, month, day));
    return date.toISOString().slice(0, 10);
}

function getLastDayOfMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// ── Meses / periodos ──────────────────────────────────────────────────────────

const MONTH_BY_NAME = {
    ENERO: 0,
    FEBRERO: 1,
    FEBERO: 1,
    MAR: 2,
    MARZO: 2,
    ABRIL: 3,
    MAYO: 4,
    JUNIO: 5,
    JULIO: 6,
    AGOSTO: 7,
    SEPTIEMBRE: 8,
    SETIEMBRE: 8,
    OCT: 9,
    OCTUBRE: 9,
    NOVIEMBRE: 10,
    DICIEMBRE: 11
};

function resolveMonthIndex(monthRaw) {
    const normalized = normalizeText(monthRaw).replace(/[^A-Z]/g, '');
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
    const regex = /(\d{1,2})\s*(?:AL|A|-)\s*(\d{1,2})\s*(?:DE)?\s*([A-ZÑÁÉÍÓÚ]+)/i;
    const match = normalized.match(regex);

    if (!match) return null;

    const dayStart = Number(match[1]);
    const dayEnd = Number(match[2]);
    const monthIndex = resolveMonthIndex(match[3]);

    if (!Number.isInteger(dayStart) || !Number.isInteger(dayEnd) || monthIndex === null) {
        return null;
    }

    return { header, dayStart, dayEnd, monthIndex };
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

function parsePeriodoHeader(value, year, fallbackMonthIndex = null) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    const normalized = normalizeText(raw);
    if (!normalized) return null;

    if (isIsoDate(raw)) {
        return {
            tipo_periodo: 'SEMANAL',
            fecha_inicio: raw,
            fecha_fin: raw
        };
    }

    const mesAnioRegex = /^(\d{4})-(\d{1,2})$/;
    const mesAnioMatch = raw.trim().match(mesAnioRegex);
    if (mesAnioMatch) {
        const y = Number(mesAnioMatch[1]);
        const m = Number(mesAnioMatch[2]) - 1;
        if (isValidYear(y) && m >= 0 && m <= 11) {
            return {
                tipo_periodo: 'MENSUAL',
                fecha_inicio: formatDate(y, m, 1),
                fecha_fin: formatDate(y, m, getLastDayOfMonth(y, m))
            };
        }
    }

    const esMensual = /MES|MENSUAL/.test(normalized);
    if (esMensual) {
        const monthIndex = resolveMonthIndex(normalized) ?? fallbackMonthIndex;
        if (monthIndex === null) return null;
        return {
            tipo_periodo: 'MENSUAL',
            fecha_inicio: formatDate(year, monthIndex, 1),
            fecha_fin: formatDate(year, monthIndex, getLastDayOfMonth(year, monthIndex))
        };
    }

    const week = parseWeekHeader(raw);
    if (week) {
        return {
            tipo_periodo: 'SEMANAL',
            fecha_inicio: formatDate(year, week.monthIndex, week.dayStart),
            fecha_fin: formatDate(year, week.monthIndex, week.dayEnd)
        };
    }

    return null;
}

// ── Categorías ────────────────────────────────────────────────────────────────

function extractCategoryName(dbNombre) {
    const raw = String(dbNombre ?? '').trim();
    const match = raw.match(/(?:\d+\s*-\s*)?(?:\d+\s*-)?\s*(.+)$/);
    if (match && match[1]) return match[1].trim();
    return raw;
}

// ── Proveedores ───────────────────────────────────────────────────────────────

function getProveedorAliasCandidates(value) {
    const raw = normalizeProveedorName(value);
    if (!raw) return [];

    const aliases = new Set([raw]);

    const aliasMap = {
        ALICORP: ['ALICORP ALIMENTOS'],
        'SAN JORGE': ['SAN JORGE VELAS Y VELONES'],
        'LA CORUNA': ['LA CORU A'],
        JOHNSON: ['JOHNSON Y JOHNSON'],
        OSA: ['LAB OSA'],
        COFARMA: ['LAB COFARMA'],
        KELLOGGS: ['KELLOGG']
    };

    if (aliasMap[raw]) {
        aliasMap[raw].forEach(a => aliases.add(normalizeProveedorName(a)));
    }

    if (raw === 'REY') aliases.add('EL REY');
    if (raw === 'COFARMA') {
        aliases.add('LAB COFARMA');
        aliases.add('LAB. COFARMA');
    }
    if (raw === 'KELLOGGS') {
        aliases.add('KELLOGG');
        aliases.add(raw.slice(0, -1));
    }

    if (raw.length > 4 && raw.endsWith('S')) aliases.add(raw.slice(0, -1));

    if (raw.startsWith('EL ')) aliases.add(raw.slice(3));
    if (raw.startsWith('LA ')) aliases.add(raw.slice(3));

    return [...aliases].filter(Boolean);
}

// ── Precarga de maestros (SOLO LECTURA, nunca crear) ──────────────────────────

/**
 * Precarga vendedores en un Map clave → vendedor.
 * Estrategia anti-duplicados:
 *  - La DB tiene el mismo vendedor en 2 formatos ("0150" y "150").
 *  - SIEMPRE preferimos el padded ("0150") sobre el unpadded ("150").
 *  - Claves del map: padded (4 dígitos) y numKey (número sin ceros).
 */
async function preloadVendedores() {
    const vendedores = await models.vendedor_model.findAll({
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });

    const map = new Map();
    vendedores.forEach(v => {
        const raw = String(v.codigo_vendedor ?? '').trim().replace(/^"|"$/g, '');
        if (!raw) return;

        const padded = formatVendedorCode(raw);
        const numKey = normalizeVendedorCode(raw);

        // Preferir padded: no sobreescribir si ya existe la clave con padded
        if (padded && !map.has(padded)) map.set(padded, v);

        // numKey como respaldo, solo si no existe ya (así el padded prevalece)
        if (numKey && !map.has(numKey)) map.set(numKey, v);

        // clave cruda como último recurso
        if (!map.has(raw)) map.set(raw, v);
    });

    return map;
}

async function preloadCategorias() {
    const categorias = await models.categoria_model.findAll({
        attributes: ['id_categoria', 'nombre']
    });

    const map = new Map();
    const byExtracted = new Map();
    categorias.forEach(c => {
        const nombreNorm = normalizeText(c.nombre);
        if (nombreNorm && !map.has(nombreNorm)) map.set(nombreNorm, c);
        const extracted = normalizeText(extractCategoryName(c.nombre));
        if (extracted && !byExtracted.has(extracted)) byExtracted.set(extracted, c);
    });

    return { map, byExtracted };
}

async function preloadProveedores() {
    const proveedores = await models.proveedor_model.findAll({
        attributes: ['id_proveedor', 'nombre', 'codigo']
    });

    const map = new Map();
    proveedores.forEach(p => {
        const nombreNorm = normalizeProveedorName(p.nombre);
        if (nombreNorm && !map.has(nombreNorm)) map.set(nombreNorm, p);
        const codigoNorm = normalizeProveedorName(p.codigo);
        if (codigoNorm && !map.has(codigoNorm)) map.set(codigoNorm, p);
    });

    return map;
}

// ── Resolución (SOLO LECTURA, nunca crear) ────────────────────────────────────

function resolveVendedor(codigoRaw, vendedorMap) {
    const raw = String(codigoRaw ?? '').trim().replace(/^"|"$/g, '');
    if (!raw) return null;

    const padded = formatVendedorCode(raw);
    const numKey = normalizeVendedorCode(raw);

    if (padded && vendedorMap.has(padded)) return vendedorMap.get(padded);
    if (numKey && vendedorMap.has(numKey)) return vendedorMap.get(numKey);
    if (vendedorMap.has(raw)) return vendedorMap.get(raw);

    return null;
}

function resolveCategoria(nombreCSV, { map, byExtracted }) {
    const key = normalizeText(nombreCSV);
    if (!key) return null;

    if (map.has(key)) return map.get(key);
    if (byExtracted.has(key)) return byExtracted.get(key);

    for (const [dbKey, categoria] of map) {
        if (key.length >= 3 && dbKey.includes(key)) {
            return categoria;
        }
    }

    return null;
}

function resolveProveedor(nombreCSV, proveedorMap) {
    const candidates = getProveedorAliasCandidates(nombreCSV);
    if (!candidates.length) return null;

    for (const candidate of candidates) {
        const found = proveedorMap.get(candidate);
        if (found) return found;
    }

    const compactCandidate = normalizeCompact(nombreCSV);
    for (const [normName, proveedor] of proveedorMap) {
        const compactDb = normalizeCompact(normName);
        if (compactCandidate && compactDb && (compactDb.includes(compactCandidate) || compactCandidate.includes(compactDb))) {
            return proveedor;
        }
    }

    return null;
}

// ── Extracción de año del CSV ─────────────────────────────────────────────────

function extraerAnio(rows, headerAnio, optionsYear) {
    if (headerAnio) {
        const anios = [...new Set(rows
            .map(row => String(row[headerAnio] ?? '').trim())
            .filter(Boolean))];

        if (anios.length === 1 && isValidYear(anios[0])) {
            return { year: Number(anios[0]), origen: 'csv' };
        }
    }

    if (isValidYear(optionsYear)) {
        return { year: Number(optionsYear), origen: 'param' };
    }

    return { year: new Date().getFullYear(), origen: 'default' };
}

// ── Base para los 3 flujos ────────────────────────────────────────────────────

/**
 * Crea el resumen inicial común a los 3 flujos.
 */
function baseResumen(tipo, year, origenAnio) {
    return {
        success: true,
        tipo,
        year,
        anio_origen: origenAnio,
        filas_procesadas: 0,
        registros_creados: 0,
        registros_omitidos: 0,
        errores: []
    };
}

/**
 * Aplica la política "all or nothing":
 *  - Si hay errores de validación, NO se carga NADA y se marca success:false.
 */
function finalizar(resumen, registros) {
    if (resumen.errores.length > 0) {
        resumen.success = false;
        resumen.mensaje = `Importación RECHAZADA: ${resumen.errores.length} errores de validación. Ningún registro fue cargado.`;
        return resumen;
    }

    if (registros.length === 0) {
        resumen.mensaje = 'Sin registros con cuota para cargar (todas vacías o cero).';
        return resumen;
    }

    return resumen;
}

// ── Flujo: Clientes (formato ancho) ───────────────────────────────────────────

async function importarCliente(fileContent, options = {}) {
    const content = decodeContent(fileContent);
    const { headers, rows } = parseCsv(content);

    const headerCodigo = findHeaderByAliases(headers, ['cod_vendedor', 'codigo_vendedor', 'codigo', 'cod']);
    const headerNombre = findHeaderByAliases(headers, ['nombre', 'vendedor', 'nombre_vendedor']);
    const headerAnio = findHeaderByAliases(headers, ['anio', 'año', 'year']);

    if (!headerCodigo) {
        throw new Error('No se encontró el encabezado de código (cod_vendedor/codigo_vendedor).');
    }

    const weekColumns = extractWeekColumns(headers);
    const columnasMensuales = headers.filter(h => /MES|MENSUAL/.test(normalizeText(h)));
    const fixedHeaders = new Set([headerCodigo, headerNombre, headerAnio].filter(Boolean));
    const columnasPeriodo = headers.filter(h => !fixedHeaders.has(h));

    if (!weekColumns.length && columnasMensuales.length === 0) {
        throw new Error('No se identificaron columnas de periodo ("1 al 2 de mayo" o "CUOTA MES").');
    }

    const { year, origen } = extraerAnio(rows, headerAnio, options.year);
    const fallbackMonth = detectMostFrequentMonth(weekColumns) ?? null;

    const periodos = [];
    for (const header of columnasPeriodo) {
        const periodo = parsePeriodoHeader(header, year, fallbackMonth);
        if (periodo) periodos.push({ header, ...periodo });
    }

    if (!periodos.length) {
        throw new Error('No se pudieron interpretar las columnas de periodo.');
    }

    const vendedorMap = await preloadVendedores();
    const resumen = baseResumen('cliente', year, origen);

    const bulk = [];
    rows.forEach((row, index) => {
        const codigoRaw = String(row[headerCodigo] ?? '').trim();
        if (!codigoRaw) return;

        const fila = index + 2;
        const nombreRaw = String(row[headerNombre] ?? '').trim();
        const vendedor = resolveVendedor(codigoRaw, vendedorMap);

        if (!vendedor) {
            resumen.errores.push({
                fila,
                codigo_vendedor: codigoRaw,
                nombre: nombreRaw,
                motivo: 'Vendedor no existe en la maestra'
            });
            return;
        }

        resumen.filas_procesadas += 1;

        for (const periodo of periodos) {
            const cuota = parseAmount(row[periodo.header]);
            if (isSinCuota(row[periodo.header])) {
                resumen.registros_omitidos += 1;
                continue;
            }
            bulk.push({
                id_vendedor: vendedor.id_vendedor,
                tipo_periodo: periodo.tipo_periodo,
                fecha_inicio: periodo.fecha_inicio,
                fecha_fin: periodo.fecha_fin,
                cuota
            });
        }
    });

    finalizar(resumen, bulk);

    if (resumen.success && bulk.length) {
        for (const chunk of chunkArray(bulk, BULK_CHUNK_SIZE)) {
            try {
                await models.impactosCliente_model.bulkCreate(chunk, {
                    updateOnDuplicate: ['cuota'],
                    conflictAttributes: ['id_vendedor', 'fecha_inicio', 'fecha_fin']
                });
                resumen.registros_creados += chunk.length;
            } catch (err) {
                resumen.errores.push({ motivo: `Error en bulkCreate de impactos_cliente: ${err.message}` });
                resumen.success = false;
            }
        }
    }

    return resumen;
}

// ── Flujo: Categorías (formato vertical) ──────────────────────────────────────

async function importarCategoria(fileContent, options = {}) {
    const content = decodeContent(fileContent);
    const { headers, rows } = parseCsv(content);

    const headerCodigo = findHeaderByAliases(headers, ['cod_vendedor', 'codigo_vendedor', 'codigo', 'cod']);
    const headerNombre = findHeaderByAliases(headers, ['nombre', 'vendedor', 'nombre_vendedor']);
    const headerPeriodo = findHeaderByAliases(headers, ['periodo', 'semana', 'cuota mes', 'mes']);
    const headerAnio = findHeaderByAliases(headers, ['anio', 'año', 'year']);

    if (!headerCodigo) {
        throw new Error('No se encontró el encabezado de código (cod_vendedor/codigo_vendedor).');
    }
    if (!headerPeriodo) {
        throw new Error('No se encontró el encabezado de periodo (periodo/cuota mes).');
    }

    const fixedHeaders = new Set([headerCodigo, headerNombre, headerPeriodo, headerAnio].filter(Boolean));
    const categoriasCols = headers.filter(h => !fixedHeaders.has(h));

    if (!categoriasCols.length) {
        throw new Error('No se encontraron columnas de categorías en el archivo.');
    }

    const { year, origen } = extraerAnio(rows, headerAnio, options.year);
    const periodosValores = rows
        .map(row => String(row[headerPeriodo] ?? '').trim())
        .filter(Boolean);
    const fallbackMonth = detectMostFrequentMonth(periodosValores.map(v => parseWeekHeader(v)).filter(Boolean)) ?? null;

    const vendedorMap = await preloadVendedores();
    const categoriaCache = await preloadCategorias();

    const resumen = baseResumen('categoria', year, origen);

    const bulk = [];
    rows.forEach((row, index) => {
        const codigoRaw = String(row[headerCodigo] ?? '').trim();
        if (!codigoRaw) return;

        const fila = index + 2;
        const nombreRaw = String(row[headerNombre] ?? '').trim();
        const periodo = parsePeriodoHeader(row[headerPeriodo], year, fallbackMonth);

        if (!periodo) {
            resumen.errores.push({
                fila,
                codigo_vendedor: codigoRaw,
                periodo: String(row[headerPeriodo] ?? '').trim(),
                motivo: 'Periodo no interpretable'
            });
            return;
        }

        const vendedor = resolveVendedor(codigoRaw, vendedorMap);
        if (!vendedor) {
            resumen.errores.push({
                fila,
                codigo_vendedor: codigoRaw,
                nombre: nombreRaw,
                motivo: 'Vendedor no existe en la maestra'
            });
            return;
        }

        resumen.filas_procesadas += 1;

        for (const colCategoria of categoriasCols) {
            if (isSinCuota(row[colCategoria])) {
                resumen.registros_omitidos += 1;
                continue;
            }

            const categoria = resolveCategoria(colCategoria, categoriaCache);
            if (!categoria) {
                resumen.errores.push({
                    fila,
                    codigo_vendedor: codigoRaw,
                    categoria: colCategoria,
                    motivo: 'Categoría no existe en la maestra'
                });
                continue;
            }

            bulk.push({
                id_vendedor: vendedor.id_vendedor,
                id_categoria: categoria.id_categoria,
                tipo_periodo: periodo.tipo_periodo,
                fecha_inicio: periodo.fecha_inicio,
                fecha_fin: periodo.fecha_fin,
                cuota: parseAmount(row[colCategoria])
            });
        }
    });

    finalizar(resumen, bulk);

    if (resumen.success && bulk.length) {
        for (const chunk of chunkArray(bulk, BULK_CHUNK_SIZE)) {
            try {
                await models.impactosCategoria_model.bulkCreate(chunk, {
                    updateOnDuplicate: ['cuota'],
                    conflictAttributes: ['id_vendedor', 'id_categoria', 'fecha_inicio', 'fecha_fin']
                });
                resumen.registros_creados += chunk.length;
            } catch (err) {
                resumen.errores.push({ motivo: `Error en bulkCreate de impactos_categoria: ${err.message}` });
                resumen.success = false;
            }
        }
    }

    return resumen;
}

// ── Flujo: Proveedores (formato vertical) ─────────────────────────────────────

async function importarProveedor(fileContent, options = {}) {
    const content = decodeContent(fileContent);
    const { headers, rows } = parseCsv(content);

    const headerCodigo = findHeaderByAliases(headers, ['cod_vendedor', 'codigo_vendedor', 'codigo', 'cod']);
    const headerNombre = findHeaderByAliases(headers, ['nombre', 'vendedor', 'nombre_vendedor']);
    const headerPeriodo = findHeaderByAliases(headers, ['periodo', 'semana', 'cuota mes', 'mes']);
    const headerAnio = findHeaderByAliases(headers, ['anio', 'año', 'year']);

    if (!headerCodigo) {
        throw new Error('No se encontró el encabezado de código (cod_vendedor/codigo_vendedor).');
    }
    if (!headerPeriodo) {
        throw new Error('No se encontró el encabezado de periodo (periodo/cuota mes).');
    }

    const fixedHeaders = new Set([headerCodigo, headerNombre, headerPeriodo, headerAnio].filter(Boolean));
    const proveedorCols = headers.filter(h => !fixedHeaders.has(h));

    if (!proveedorCols.length) {
        throw new Error('No se encontraron columnas de proveedores en el archivo.');
    }

    const { year, origen } = extraerAnio(rows, headerAnio, options.year);
    const periodosValores = rows
        .map(row => String(row[headerPeriodo] ?? '').trim())
        .filter(Boolean);
    const fallbackMonth = detectMostFrequentMonth(periodosValores.map(v => parseWeekHeader(v)).filter(Boolean)) ?? null;

    const vendedorMap = await preloadVendedores();
    const proveedorMap = await preloadProveedores();

    const resumen = baseResumen('proveedor', year, origen);

    const bulk = [];
    rows.forEach((row, index) => {
        const codigoRaw = String(row[headerCodigo] ?? '').trim();
        if (!codigoRaw) return;

        const fila = index + 2;
        const nombreRaw = String(row[headerNombre] ?? '').trim();
        const periodo = parsePeriodoHeader(row[headerPeriodo], year, fallbackMonth);

        if (!periodo) {
            resumen.errores.push({
                fila,
                codigo_vendedor: codigoRaw,
                periodo: String(row[headerPeriodo] ?? '').trim(),
                motivo: 'Periodo no interpretable'
            });
            return;
        }

        const vendedor = resolveVendedor(codigoRaw, vendedorMap);
        if (!vendedor) {
            resumen.errores.push({
                fila,
                codigo_vendedor: codigoRaw,
                nombre: nombreRaw,
                motivo: 'Vendedor no existe en la maestra'
            });
            return;
        }

        resumen.filas_procesadas += 1;

        for (const colProveedor of proveedorCols) {
            if (isSinCuota(row[colProveedor])) {
                resumen.registros_omitidos += 1;
                continue;
            }

            const proveedor = resolveProveedor(colProveedor, proveedorMap);
            if (!proveedor) {
                resumen.errores.push({
                    fila,
                    codigo_vendedor: codigoRaw,
                    proveedor: colProveedor,
                    motivo: 'Proveedor no existe en la maestra'
                });
                continue;
            }

            bulk.push({
                id_vendedor: vendedor.id_vendedor,
                id_proveedor: proveedor.id_proveedor,
                tipo_periodo: periodo.tipo_periodo,
                fecha_inicio: periodo.fecha_inicio,
                fecha_fin: periodo.fecha_fin,
                cuota: parseAmount(row[colProveedor])
            });
        }
    });

    finalizar(resumen, bulk);

    if (resumen.success && bulk.length) {
        for (const chunk of chunkArray(bulk, BULK_CHUNK_SIZE)) {
            try {
                await models.impactosProveedor_model.bulkCreate(chunk, {
                    updateOnDuplicate: ['cuota'],
                    conflictAttributes: ['id_vendedor', 'id_proveedor', 'fecha_inicio', 'fecha_fin']
                });
                resumen.registros_creados += chunk.length;
            } catch (err) {
                resumen.errores.push({ motivo: `Error en bulkCreate de impactos_proveedor: ${err.message}` });
                resumen.success = false;
            }
        }
    }

    return resumen;
}

// ── Consulta ──────────────────────────────────────────────────────────────────

const MODEL_BY_TIPO = {
    cliente: { model: models.impactosCliente_model, table: 'impactos_cliente', alias: 'ic', tipo: 'clientes' },
    clientes: { model: models.impactosCliente_model, table: 'impactos_cliente', alias: 'ic', tipo: 'clientes' },
    categoria: { model: models.impactosCategoria_model, table: 'impactos_categoria', alias: 'icat', tipo: 'categorias' },
    categorias: { model: models.impactosCategoria_model, table: 'impactos_categoria', alias: 'icat', tipo: 'categorias' },
    proveedor: { model: models.impactosProveedor_model, table: 'impactos_proveedor', alias: 'ipr', tipo: 'proveedores' },
    proveedores: { model: models.impactosProveedor_model, table: 'impactos_proveedor', alias: 'ipr', tipo: 'proveedores' }
};

function toArr(val) {
    if (val == null || val === '') return [];
    const raw = Array.isArray(val) ? val : String(val).split(',');
    const flat = raw.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
    return [...new Set(flat)];
}

function buildJoinsExtras(cfg) {
    if (cfg.tipo === 'categorias') {
        return {
            joins: 'LEFT JOIN categoria cat ON cat.id_categoria = icat.id_categoria',
            select: ', cat.nombre AS nombre_categoria'
        };
    }
    if (cfg.tipo === 'proveedores') {
        return {
            joins: 'LEFT JOIN proveedor pr ON pr.id_proveedor = ipr.id_proveedor',
            select: ', pr.nombre AS nombre_proveedor'
        };
    }
    return { joins: '', select: '' };
}

/**
 * Resuelve los ids de vendedores que tienen ventas en los canales/ciudades
 * seleccionados (filtros de la vista). Devuelve null si no hay filtro.
 */
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
        SELECT DISTINCT vd.id_vendedor
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        LEFT JOIN canal ca ON ca.id_canal = v.id_canal
        LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        WHERE ${conds.join(' AND ')}
    `;

    const rows = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
    });
    return rows.map(r => r.id_vendedor);
}

/**
 * Consulta impactos con filtros + scope por rol.
 *
 * @param {string} tipo clientes | categorias | proveedores
 * @param {object} filtros
 *   - fechaInicio, fechaFin (YYYY-MM-DD, rango de superposición con el periodo)
 *   - tipoPeriodo (SEMANAL | MENSUAL)
 *   - vendedor (solo aplica si el scope es 'all', admin)
 *   - categoria, proveedor (ids)
 *   - canal, ciudad (ids → se resuelven a vendedores con ventas en ese ámbito)
 *   - idsScope (ids de vendedor permitidos por rol; null = todos)
 */
async function obtenerImpactos(tipo, filtros = {}) {
    const cfg = MODEL_BY_TIPO[String(tipo).toLowerCase()];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: clientes, categorias o proveedores.');
    }

    const replacements = {};
    const where = [];
    const alias = cfg.alias;

    // 1. Scope por rol (admin=null/todos, supervisor=equipo, vendedor=él mismo)
    const idsScope = filtros.idsScope;
    if (Array.isArray(idsScope)) {
        if (idsScope.length) {
            where.push(`${alias}.id_vendedor IN (:scopeVendedores)`);
            replacements.scopeVendedores = idsScope;
        } else {
            where.push(`${alias}.id_vendedor = -1`);
        }
    }

    // 2. Filtro vendedor del front (solo se aplica si vino permitido)
    const vendedoresFiltro = toArr(filtros.vendedor);
    if (vendedoresFiltro.length) {
        where.push(`${alias}.id_vendedor IN (
            SELECT id_vendedor FROM vendedor WHERE codigo_vendedor IN (:codVendFront)
        )`);
        replacements.codVendFront = vendedoresFiltro;
    }

    // 3. Canal/ciudad → vendedores con ventas en ese ámbito
    const idsVendedorCanalCiudad = await resolverVendedoresPorCanalCiudad(filtros);
    if (Array.isArray(idsVendedorCanalCiudad)) {
        if (idsVendedorCanalCiudad.length) {
            where.push(`${alias}.id_vendedor IN (:idsVendedorCanalCiudad)`);
            replacements.idsVendedorCanalCiudad = idsVendedorCanalCiudad;
        } else {
            where.push(`${alias}.id_vendedor = -1`);
        }
    }

    // 4. Fechas (superposición con el periodo)
    if (filtros.fechaInicio) {
        where.push(`${alias}.fecha_fin >= :fechaInicio`);
        replacements.fechaInicio = filtros.fechaInicio;
    }
    if (filtros.fechaFin) {
        where.push(`${alias}.fecha_inicio <= :fechaFin`);
        replacements.fechaFin = filtros.fechaFin;
    }

    // 5. Tipo de periodo (cuota semana / cuota mes / adicional)
    const tipoPeriodo = toArr(filtros.tipoPeriodo);
    if (tipoPeriodo.length) {
        where.push(`${alias}.tipo_periodo IN (:tipoPeriodo)`);
        replacements.tipoPeriodo = tipoPeriodo;
    }

    // 6. Filtros específicos de la tabla
    if (cfg.tipo === 'categorias') {
        const categorias = toArr(filtros.categoria);
        if (categorias.length) {
            where.push('CAST(icat.id_categoria AS TEXT) IN (:categorias)');
            replacements.categorias = categorias;
        }
    }
    if (cfg.tipo === 'proveedores') {
        const proveedores = toArr(filtros.proveedor);
        if (proveedores.length) {
            where.push('CAST(ipr.id_proveedor AS TEXT) IN (:proveedores)');
            replacements.proveedores = proveedores;
        }
    }

    const { joins, select } = buildJoinsExtras(cfg);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT ${alias}.*, v.codigo_vendedor, v.nombre AS nombre_vendedor
        ${select}
        FROM ${cfg.table} ${alias}
        JOIN vendedor v ON v.id_vendedor = ${alias}.id_vendedor
        ${joins}
        ${whereSql}
        ORDER BY ${alias}.fecha_inicio ASC, v.codigo_vendedor ASC
    `;

    const data = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
    });

    return {
        success: true,
        tipo: cfg.tipo,
        total: data.length,
        filtros_aplicados: {
            fechaInicio: filtros.fechaInicio || null,
            fechaFin: filtros.fechaFin || null,
            tipoPeriodo: toArr(filtros.tipoPeriodo).length ? toArr(filtros.tipoPeriodo) : null,
            vendedores: toArr(filtros.vendedor).length ? toArr(filtros.vendedor) : null,
            categorias: toArr(filtros.categoria).length ? toArr(filtros.categoria) : null,
            proveedores: toArr(filtros.proveedor).length ? toArr(filtros.proveedor) : null,
            canales: toArr(filtros.canal).length ? toArr(filtros.canal) : null,
            ciudades: toArr(filtros.ciudad).length ? toArr(filtros.ciudad) : null,
            scope: Array.isArray(idsScope)
                ? (idsScope.length ? 'restringido' : 'sin_datos')
                : 'todos'
        },
        data
    };
}

/**
 * Actualiza la cuota de un impacto existente (por id de la tabla).
 * Solo el valor `cuota` es editable.
 */
async function actualizarImpacto(tipo, id, cuota) {
    const cfg = MODEL_BY_TIPO[String(tipo).toLowerCase()];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: clientes, categorias o proveedores.');
    }

    const idRegistro = Number(id);
    if (!Number.isInteger(idRegistro) || idRegistro <= 0) {
        return { success: false, status: 400, error: 'ID de impacto inválido' };
    }

    const valor = Number(cuota);
    if (!Number.isFinite(valor)) {
        return { success: false, status: 400, error: 'Cuota inválida (debe ser numérica)' };
    }

    const registro = await cfg.model.findByPk(idRegistro);
    if (!registro) {
        return { success: false, status: 404, error: 'Registro de impacto no encontrado' };
    }

    await registro.update({ cuota: Math.round(valor * 100) / 100 });

    return {
        success: true,
        data: registro
    };
}

/**
 * Elimina un impacto existente (por id de la tabla).
 */
async function eliminarImpacto(tipo, id) {
    const cfg = MODEL_BY_TIPO[String(tipo).toLowerCase()];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: clientes, categorias o proveedores.');
    }

    const idRegistro = Number(id);
    if (!Number.isInteger(idRegistro) || idRegistro <= 0) {
        return { success: false, status: 400, error: 'ID de impacto inválido' };
    }

    const registro = await cfg.model.findByPk(idRegistro);
    if (!registro) {
        return { success: false, status: 404, error: 'Registro de impacto no encontrado' };
    }

    await registro.destroy();

    return { success: true, message: 'Impacto eliminado', id: idRegistro };
}

/**
 * Elimina impactos en bulk según vendedor + tipo + rango de fechas opcional.
 *
 * @param {string} tipo clientes | categorias | proveedores
 * @param {object} filtros
 *   - vendedor (código, ej "150"/"0150") o vendedor_id (id numérico)
 *   - fechaInicio, fechaFin (opcional: si faltan, borra TODO el histórico del vendedor)
 */
async function eliminarImpactosBulk(tipo, filtros = {}) {
    const cfg = MODEL_BY_TIPO[String(tipo).toLowerCase()];
    if (!cfg) {
        throw new Error('Tipo inválido. Use: clientes, categorias o proveedores.');
    }

    const codigo = String(filtros.vendedor ?? '').trim();
    const vendedorId = Number(filtros.vendedor_id);
    let idVendedor = null;

    if (codigo) {
        const vendedorMap = await preloadVendedores();
        const vendedor = resolveVendedor(codigo, vendedorMap);
        idVendedor = vendedor ? vendedor.id_vendedor : null;
    } else if (Number.isInteger(vendedorId) && vendedorId > 0) {
        idVendedor = vendedorId;
    }

    if (!idVendedor) {
        return {
            success: false,
            status: 400,
            error: 'Vendedor requerido y debe existir en la maestra (param: vendedor=codigo o vendedor_id=id)'
        };
    }

    const where = { id_vendedor: idVendedor };

    // Rango de fechas opcional (superposición con el periodo).
    // Si no llega, se borra TODO el histórico del vendedor+tipo.
    if (filtros.fechaInicio || filtros.fechaFin) {
        where[Op.and] = [];
        if (filtros.fechaInicio) where[Op.and].push({ fecha_fin: { [Op.gte]: filtros.fechaInicio } });
        if (filtros.fechaFin) where[Op.and].push({ fecha_inicio: { [Op.lte]: filtros.fechaFin } });
    }

    const count = await cfg.model.count({ where });

    if (count === 0) {
        return {
            success: true,
            message: 'No hay impactos que coincidan con el filtro',
            tipo: cfg.tipo,
            id_vendedor: idVendedor,
            eliminados: 0
        };
    }

    await cfg.model.destroy({ where });

    return {
        success: true,
        message: `${count} impactos eliminados`,
        tipo: cfg.tipo,
        id_vendedor: idVendedor,
        eliminados: count,
        rango: filtros.fechaInicio || filtros.fechaFin
            ? { fechaInicio: filtros.fechaInicio || null, fechaFin: filtros.fechaFin || null }
            : 'todo_el_historico'
    };
}

// ── Export ────────────────────────────────────────────────────────────────────

module.exports = {
    importarCliente,
    importarCategoria,
    importarProveedor,
    obtenerImpactos,
    actualizarImpacto,
    eliminarImpacto,
    eliminarImpactosBulk,
    // Utils para pruebas
    _test: {
        parsePeriodoHeader,
        parseWeekHeader,
        extractCategoryName,
        normalizeText,
        normalizeProveedorName,
        normalizeVendedorCode,
        formatVendedorCode,
        resolveMonthIndex,
        parseAmount,
        resolveVendedor,
        resolveCategoria,
        resolveProveedor
    }
};