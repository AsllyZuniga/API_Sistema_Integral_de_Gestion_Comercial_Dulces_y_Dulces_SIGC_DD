'use strict';

const { Op } = require('sequelize');
const models = require('../models');

const CUOTAS_BULK_CHUNK_SIZE = 2000;
const ASIGNACIONES_BULK_CHUNK_SIZE = 3000;

function chunkArray(items, chunkSize) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const chunks = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectDelimiter(headerLine) {
    if (headerLine.includes('|')) return '|';
    if (headerLine.includes('\t')) return '\t';
    if (headerLine.includes(';')) return ';';
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
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length < 2) throw new Error('El archivo debe tener al menos una fila de encabezados y una de datos.');

    const delimiter = detectDelimiter(nonEmpty[0]);
    const headers = splitCsvLine(nonEmpty[0], delimiter).map(h => h.trim());
    const rows = nonEmpty.slice(1).map(line => {
        const cells = splitCsvLine(line, delimiter);
        const row = {};
        headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
        return row;
    });
    return { headers, rows };
}

function findHeaderByAliases(headers, aliases) {
    const lowerMap = new Map(headers.map(h => [h.trim().toLowerCase(), h]));
    for (const alias of aliases) {
        const header = lowerMap.get(alias.toLowerCase());
        if (header) return header;
    }
    return null;
}

function parseCuota(value) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    if (!raw) return NaN;
    const normalized = raw
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return Number(normalized);
}

function normalizeHeader(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

function getProveedorAliasCandidates(value) {
    const raw = normalizeProveedorName(value);
    if (!raw) return [];

    const aliases = new Set([raw]);

    // Mapeo explícito de alias
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

    // Variantes comunes de encabezados de cuotas vs. catálogo proveedor
    if (raw === 'REY') aliases.add('EL REY');
    if (raw === 'COFARMA') {
        aliases.add('LAB COFARMA');
        aliases.add('LAB. COFARMA');
    }
    if (raw === 'KELLOGGS') {
        aliases.add('KELLOGG');
        aliases.add(raw.slice(0, -1)); // KELLOGG sin la S
    }
    if (raw === 'HALEON') aliases.add('HALEON');

    // Intentar singular/plural simple (KELLOGGS <-> KELLOGG)
    if (raw.length > 4 && raw.endsWith('S')) aliases.add(raw.slice(0, -1));

    // Quitar artículos opcionales
    if (raw.startsWith('EL ')) aliases.add(raw.slice(3));
    if (raw.startsWith('LA ')) aliases.add(raw.slice(3));

    return [...aliases].filter(Boolean);
}

function isIsoDate(value) {
    const raw = String(value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    const date = new Date(`${raw}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function isSinCuota(value) {
    const raw = String(value ?? '').trim().replace(/^"|"$/g, '');
    if (!raw || raw === '-') return true;
    if (raw.toLowerCase() === 'null') return true;

    const normalized = raw
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed === 0;
}

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * importFromBuffer
 * @param {Buffer|string} fileContent  - Contenido del CSV/TSV
 * @param {string}        fecha_inicio - 'YYYY-MM-DD'
 * @param {string}        fecha_fin    - 'YYYY-MM-DD'
 * @returns {Object} Resumen del proceso
 */
async function importFromBuffer(fileContent, fecha_inicio, fecha_fin) {
    const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf8') : fileContent;
    const { headers, rows } = parseCsv(content);

    const codigoHeader = findHeaderByAliases(headers, ['codigo_vendedor', 'codigo']);
    const nombreHeader = findHeaderByAliases(headers, ['nombre_vendedor', 'vendedor', 'nombre']);
    const fechaInicioHeader = findHeaderByAliases(headers, ['fecha_inicio', 'fecha inicio', 'fechainicio']);
    const fechaFinHeader = findHeaderByAliases(headers, ['fecha_fin', 'fecha fin', 'fechafin']);

    const fechaInicioCsv = fechaInicioHeader ? String(rows[0]?.[fechaInicioHeader] || '').trim() : '';
    const fechaFinCsv = fechaFinHeader ? String(rows[0]?.[fechaFinHeader] || '').trim() : '';

    const fechaInicioFinal = String(fecha_inicio || fechaInicioCsv || '').trim();
    const fechaFinFinal = String(fecha_fin || fechaFinCsv || '').trim();

    if (!fechaInicioFinal || !fechaFinFinal) {
        throw new Error('Se requieren fecha_inicio y fecha_fin (formato YYYY-MM-DD), ya sea en body o columnas del CSV.');
    }
    if (!isIsoDate(fechaInicioFinal) || !isIsoDate(fechaFinFinal)) {
        throw new Error('fecha_inicio y fecha_fin deben tener formato válido YYYY-MM-DD.');
    }

    if (!codigoHeader || !nombreHeader) {
        throw new Error('Encabezados inválidos. Debe incluir codigo_vendedor/codigo y nombre_vendedor/vendedor.');
    }

    const reservedHeaders = new Set([
        'codigo',
        'codigo_vendedor',
        'vendedor',
        'nombre',
        'nombre_vendedor',
        'fecha_inicio',
        'fecha inicio',
        'fechainicio',
        'fecha_fin',
        'fecha fin',
        'fechafin'
    ]);

    const fixedCols = new Set([codigoHeader, nombreHeader, fechaInicioHeader, fechaFinHeader].filter(Boolean));
    const proveedorCols = headers.filter(h => {
        const normalized = normalizeHeader(h);
        if (!normalized) return false;
        if (fixedCols.has(h)) return false;
        return !reservedHeaders.has(normalized);
    });

    if (proveedorCols.length === 0) {
        throw new Error('No se encontraron columnas de proveedores en el archivo.');
    }

    // Resolver proveedores por encabezado y crearlos en bulk si no existen
    const proveedorMap = {};
    const proveedoresCreados = [];
    const proveedoresNoEncontrados = [];
    const proveedoresUnicos = [...new Set(proveedorCols.map(col => col.trim()).filter(Boolean))];
    const proveedoresUpper = proveedoresUnicos.map(nombre => nombre.toUpperCase());

    if (proveedoresUpper.length > 0) {
        const proveedoresDB = await models.proveedor_model.findAll({
            attributes: ['id_proveedor', 'nombre', 'codigo']
        });

        const proveedorExistentePorClave = new Map();
        proveedoresDB.forEach(p => {
            const nombreNorm = normalizeProveedorName(p.nombre);
            if (nombreNorm && !proveedorExistentePorClave.has(nombreNorm)) {
                proveedorExistentePorClave.set(nombreNorm, p);
            }

            const codigoNorm = normalizeProveedorName(p.codigo);
            if (codigoNorm && !proveedorExistentePorClave.has(codigoNorm)) {
                proveedorExistentePorClave.set(codigoNorm, p);
            }
        });

        for (const nombre of proveedoresUnicos) {
            const candidates = getProveedorAliasCandidates(nombre);
            const proveedorMatch = candidates
                .map(candidate => proveedorExistentePorClave.get(candidate))
                .find(Boolean);

            if (proveedorMatch) {
                proveedorMap[nombre.toUpperCase()] = proveedorMatch;
                continue;
            }
            proveedoresNoEncontrados.push(nombre);
        }

        const proveedoresFinales = await models.proveedor_model.findAll({
            attributes: ['id_proveedor', 'nombre', 'codigo']
        });

        proveedoresFinales.forEach(p => {
            const nombreOriginal = String(p.nombre || '').trim().toUpperCase();
            if (nombreOriginal && !proveedorMap[nombreOriginal]) {
                proveedorMap[nombreOriginal] = p;
            }
        });

        // Garantizar mapeo por cada encabezado usando alias/candidatos
        for (const nombre of proveedoresUnicos) {
            const direct = proveedorMap[nombre.toUpperCase()];
            if (direct) continue;

            const candidates = getProveedorAliasCandidates(nombre);
            const proveedorMatch = proveedoresFinales.find(p => {
                const n1 = normalizeProveedorName(p.nombre);
                const n2 = normalizeProveedorName(p.codigo);
                if (candidates.includes(n1) || candidates.includes(n2)) return true;

                const compactN1 = normalizeCompact(n1);
                const compactN2 = normalizeCompact(n2);
                return candidates.some(candidate => {
                    const compactCandidate = normalizeCompact(candidate);
                    return compactN1.includes(compactCandidate) || compactCandidate.includes(compactN1)
                        || compactN2.includes(compactCandidate) || compactCandidate.includes(compactN2);
                });
            });

            if (proveedorMatch) {
                proveedorMap[nombre.toUpperCase()] = proveedorMatch;
            }
        }
    }

    // Precargar todos los vendedores involucrados
    const codigosVendedorRaw = [
        ...new Set(
            rows
                .map(r => String(r[codigoHeader] || '').trim())
                .filter(Boolean)
        )
    ];

    const codigosVendedorConsulta = [
        ...new Set(
            codigosVendedorRaw.flatMap(code => [
                code,
                formatVendedorCode(code),
                normalizeVendedorCode(code)
            ].filter(Boolean))
        )
    ];

    const vendedoresDB = await models.vendedor_model.findAll({
        where: { codigo_vendedor: { [Op.in]: codigosVendedorConsulta } },
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });
    const vendedorMap = {};
    vendedoresDB.forEach(v => {
        const codigoRaw = String(v.codigo_vendedor).trim();
        const key = normalizeVendedorCode(codigoRaw);
        vendedorMap[key] = v;
        vendedorMap[codigoRaw] = v;
    });

    // Resolver ids de proveedores para consultas masivas posteriores
    const proveedorIds = Object.values(proveedorMap)
        .map(p => p.id_proveedor)
        .filter(Boolean);

    // Contadores
    const resumen = {
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        filas_procesadas: 0,
        cuotas_creadas: 0,
        cuotas_omitidas: 0,
        errores: [],
        proveedores_no_encontrados: proveedoresNoEncontrados,
        proveedores_procesados: proveedorCols,
        proveedores_creados: proveedoresCreados,
        vendedores_creados: []
    };

    // --- Bulk processing ---
    // 1. Crear vendedores faltantes en bulk
    const nuevosVendedores = [];
    const nuevosVendedoresKeys = new Set();
    for (const row of rows) {
        const codigoVendedorRaw = String(row[codigoHeader] || '').trim();
        const codigoVendedor = normalizeVendedorCode(codigoVendedorRaw);
        if (!codigoVendedor) continue;
        if (!vendedorMap[codigoVendedor] && !nuevosVendedoresKeys.has(codigoVendedor)) {
            const codigoFormateado = formatVendedorCode(codigoVendedorRaw);
            nuevosVendedores.push({
                codigo_vendedor: codigoFormateado || codigoVendedor,
                nombre: String(row[nombreHeader] || '').trim() || `VENDEDOR ${codigoFormateado || codigoVendedor}`
            });
            nuevosVendedoresKeys.add(codigoVendedor);
        }
    }
    if (nuevosVendedores.length > 0) {
        try {
            await models.vendedor_model.bulkCreate(nuevosVendedores, { ignoreDuplicates: true });

            // Recargar vendedores para garantizar id_vendedor incluso con duplicados ignorados
            const vendedoresActualizados = await models.vendedor_model.findAll({
                where: { codigo_vendedor: { [Op.in]: codigosVendedorConsulta } },
                attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
            });

            vendedoresActualizados.forEach(v => {
                const codigoRaw = String(v.codigo_vendedor).trim();
                const codigo = normalizeVendedorCode(codigoRaw);
                if (!vendedorMap[codigo]) {
                    resumen.vendedores_creados.push(v.codigo_vendedor);
                }
                vendedorMap[codigo] = v;
                vendedorMap[codigoRaw] = v;
            });
        } catch (err) {
            resumen.errores.push({ motivo: `Error en bulkCreate de vendedores: ${err.message}` });
        }
    }

    // Buscar asignaciones existentes para el mismo periodo (vendedor + proveedor)
    const vendedorIds = Object.values(vendedorMap)
        .map(v => v.id_vendedor)
        .filter(Boolean);

    const asignacionExistentePorClave = new Map();
    if (vendedorIds.length > 0 && proveedorIds.length > 0) {
        try {
            const asignacionesExistentes = await models.vendedorCuotaProveedor_model.findAll({
                where: {
                    id_vendedor: { [Op.in]: vendedorIds },
                    id_proveedor: { [Op.in]: proveedorIds }
                },
                include: [{
                    model: models.cuotaProveedor_model,
                    as: 'cuotaProveedor',
                    required: true,
                    where: { fecha_inicio: fechaInicioFinal, fecha_fin: fechaFinFinal },
                    attributes: ['id_cuotaProveedor']
                }],
                attributes: ['id_vendedor_cuota_proveedor', 'id_vendedor', 'id_proveedor']
            });

            asignacionesExistentes.forEach(a => {
                const key = `${a.id_vendedor}|${a.id_proveedor}`;
                asignacionExistentePorClave.set(key, a.id_vendedor_cuota_proveedor);
            });
        } catch (err) {
            resumen.errores.push({ motivo: `Error consultando asignaciones existentes del periodo: ${err.message}` });
        }
    }

    // 2. Preparar cuotas y asignaciones para bulkCreate
    const cuotasProveedorBulk = [];
    const asignacionesBulk = [];
    for (const row of rows) {
        const codigoVendedorRaw = String(row[codigoHeader] || '').trim();
        const codigoVendedor = normalizeVendedorCode(codigoVendedorRaw);
        if (!codigoVendedor) continue;
        const vendedor = vendedorMap[codigoVendedor];
        if (!vendedor) continue;
        resumen.filas_procesadas++;
        for (const colProveedor of proveedorCols) {
            const valorCrudo = row[colProveedor] ?? '';
            if (isSinCuota(valorCrudo)) {
                resumen.cuotas_omitidas++;
                continue;
            }
            const cuotaNum = parseCuota(valorCrudo);
            if (isNaN(cuotaNum)) {
                resumen.errores.push({
                    codigo_vendedor: codigoVendedor,
                    proveedor: colProveedor,
                    valor: valorCrudo,
                    motivo: 'Valor de cuota no numérico'
                });
                continue;
            }
            const proveedor = proveedorMap[colProveedor.toUpperCase()];
            if (!proveedor) {
                resumen.errores.push({
                    codigo_vendedor: codigoVendedor,
                    proveedor: colProveedor,
                    motivo: 'Proveedor no disponible para procesar la cuota'
                });
                continue;
            }
            cuotasProveedorBulk.push({
                cuota: Math.round(cuotaNum),
                fecha_inicio: fechaInicioFinal,
                fecha_fin: fechaFinFinal,
                _meta: {
                    id_vendedor: vendedor.id_vendedor,
                    id_proveedor: proveedor.id_proveedor
                }
            });
        }
    }

    // 3. Bulk create de cuotasProveedor por lotes
    const asignacionPorClave = new Map();

    if (cuotasProveedorBulk.length > 0) {
        const chunks = chunkArray(cuotasProveedorBulk, CUOTAS_BULK_CHUNK_SIZE);

        for (const chunk of chunks) {
            try {
                const cuotasCreadasChunk = await models.cuotaProveedor_model.bulkCreate(
                    chunk.map(q => {
                        const { _meta, ...rest } = q;
                        return rest;
                    }),
                    { returning: true }
                );

                for (let idx = 0; idx < chunk.length; idx++) {
                    const q = chunk[idx];
                    const cuotaCreada = cuotasCreadasChunk[idx];
                    if (!cuotaCreada) continue;

                    // Validar que todos los campos requeridos estén presentes
                    if (!q._meta.id_vendedor || !q._meta.id_proveedor || !cuotaCreada.id_cuotaProveedor) {
                        resumen.errores.push({
                            motivo: `Datos incompletos para asignación: vendedor=${q._meta.id_vendedor}, proveedor=${q._meta.id_proveedor}, cuota=${cuotaCreada.id_cuotaProveedor}`
                        });
                        continue;
                    }

                    const key = `${q._meta.id_vendedor}|${q._meta.id_proveedor}`;
                    const asignacion = {
                        id_vendedor: q._meta.id_vendedor,
                        id_proveedor: q._meta.id_proveedor,
                        id_cuotaProveedor: cuotaCreada.id_cuotaProveedor,
                        estado: true
                    };

                    const idExistente = asignacionExistentePorClave.get(key);
                    if (idExistente) {
                        asignacion.id_vendedor_cuota_proveedor = idExistente;
                    }

                    // Si en el archivo viene repetido vendedor/proveedor, prevalece la última cuota
                    asignacionPorClave.set(key, asignacion);
                }
            } catch (err) {
                resumen.errores.push({ motivo: `Error en bulkCreate de cuotasProveedor: ${err.message}` });
            }
        }
    }

    asignacionesBulk.push(...asignacionPorClave.values());
    resumen.cuotas_creadas = asignacionesBulk.length;

    // 4. Bulk upsert de asignaciones por lotes
    // Primero intenta bulk insert, si falla intenta uno por uno
    if (asignacionesBulk.length > 0) {
        const chunks = chunkArray(asignacionesBulk, ASIGNACIONES_BULK_CHUNK_SIZE);
        let successCount = 0;
        let skipCount = 0;

        for (const chunk of chunks) {
            try {
                // Intenta insert masivo primero
                await models.vendedorCuotaProveedor_model.bulkCreate(chunk, {
                    ignoreDuplicates: true,
                    validate: false
                });
                successCount += chunk.length;
            } catch (bulkErr) {
                // Si falla bulk, intenta uno por uno
                console.warn(`⚠️  BulkCreate falló, intentando inserción individual: ${bulkErr.message}`);
                for (const asignacion of chunk) {
                    try {
                        await models.vendedorCuotaProveedor_model.create(asignacion, {
                            ignoreDuplicates: true,
                            validate: false
                        }).catch(() => {
                            // Ignorar duplicados silenciosamente
                            skipCount++;
                        });
                        successCount++;
                    } catch (rowErr) {
                        skipCount++;
                        // Log pero continúa
                        console.warn(`⚠️  No se pudo crear asignación: vendedor=${asignacion.id_vendedor}, proveedor=${asignacion.id_proveedor}`);
                    }
                }
            }
        }

        resumen.cuotas_creadas = successCount;
        if (skipCount > 0) {
            resumen.cuotas_omitidas += skipCount;
        }
    }

    return resumen;
}

module.exports = { importFromBuffer };
