/**
 * importCuotaProveedorService.js
 *
 * Importa asignaciones de cuotas por proveedor a partir de un CSV/TSV.
 *
 * Formato esperado (primera fila = encabezados):
 *   codigo_vendedor | nombre_vendedor | TONING | ARCOR | INCODEPF | ITALO | ...
 *
 * - Las columnas a partir de la 3ª son nombres de proveedores (dinámico).
 * - Un valor "-" o vacío en la celda significa "sin cuota" (se omite o desactiva).
 * - fecha_inicio y fecha_fin se pasan como parámetros externos (no en el CSV).
 *
 * Delimitador: se detecta automáticamente (pipe "|", tabulación "\t" o coma ",").
 */

'use strict';

const { Op } = require('sequelize');
const models  = require('../models');

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectDelimiter(headerLine) {
    if (headerLine.includes('|'))  return '|';
    if (headerLine.includes('\t')) return '\t';
    return ',';
}

function parseCsv(content) {
    const lines     = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const nonEmpty  = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length < 2) throw new Error('El archivo debe tener al menos una fila de encabezados y una de datos.');

    const delimiter = detectDelimiter(nonEmpty[0]);
    const headers   = nonEmpty[0].split(delimiter).map(h => h.trim());
    const rows      = nonEmpty.slice(1).map(line => {
        const cells = line.split(delimiter).map(c => c.trim());
        const row   = {};
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
    const raw = String(value ?? '').trim();
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
        .trim()
        .toLowerCase();
}

function isSinCuota(value) {
    return !value || value === '-' || value.toLowerCase() === 'null' || value === '0';
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
    if (!fecha_inicio || !fecha_fin) {
        throw new Error('Se requieren fecha_inicio y fecha_fin (formato YYYY-MM-DD).');
    }

    const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf8') : fileContent;
    const { headers, rows } = parseCsv(content);

    const codigoHeader = findHeaderByAliases(headers, ['codigo_vendedor', 'codigo']);
    const nombreHeader = findHeaderByAliases(headers, ['nombre_vendedor', 'vendedor', 'nombre']);

    if (!codigoHeader || !nombreHeader) {
        throw new Error('Encabezados inválidos. Debe incluir codigo_vendedor/codigo y nombre_vendedor/vendedor.');
    }

    const reservedHeaders = new Set([
        'codigo',
        'codigo_vendedor',
        'vendedor',
        'nombre',
        'nombre_vendedor'
    ]);

    const fixedCols = new Set([codigoHeader, nombreHeader]);
    const proveedorCols = headers.filter(h => {
        const normalized = normalizeHeader(h);
        if (!normalized) return false;
        if (fixedCols.has(h)) return false;
        return !reservedHeaders.has(normalized);
    });

    if (proveedorCols.length === 0) {
        throw new Error('No se encontraron columnas de proveedores en el archivo.');
    }

    // Resolver proveedores por encabezado y crearlos si no existen
    const proveedorMap = {};
    const proveedoresCreados = [];
    for (const proveedorCol of proveedorCols) {
        const nombreProveedor = proveedorCol.trim();
        const key = nombreProveedor.toUpperCase();

        let proveedor = await models.proveedor_model.findOne({
            where: {
                nombre: { [Op.iLike]: nombreProveedor }
            },
            attributes: ['id_proveedor', 'nombre']
        });

        if (!proveedor) {
            proveedor = await models.proveedor_model.create({
                nombre: nombreProveedor,
                codigo: nombreProveedor
            });
            proveedoresCreados.push(nombreProveedor);
        }

        proveedorMap[key] = proveedor;
    }

    // Precargar todos los vendedores involucrados
    const codigosVendedor = [
        ...new Set(
            rows
                .map(r => String(r[codigoHeader] || '').trim())
                .filter(Boolean)
        )
    ];
    const vendedoresDB    = await models.vendedor_model.findAll({
        where: { codigo_vendedor: { [Op.in]: codigosVendedor } },
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });
    const vendedorMap = {};
    vendedoresDB.forEach(v => { vendedorMap[String(v.codigo_vendedor).trim()] = v; });

    // Contadores
    const resumen = {
        fecha_inicio,
        fecha_fin,
        filas_procesadas:   0,
        cuotas_creadas:     0,
        cuotas_omitidas:    0,
        errores:            [],
        proveedores_no_encontrados: [],
        proveedores_procesados:     proveedorCols,
        proveedores_creados:        proveedoresCreados,
        vendedores_creados:         []
    };

    // Procesar fila por fila
    for (const row of rows) {
        const codigoVendedor = String(row[codigoHeader] || '').trim();
        if (!codigoVendedor) continue;

        let vendedor = vendedorMap[codigoVendedor];
        if (!vendedor) {
            try {
                vendedor = await models.vendedor_model.create({
                    codigo_vendedor: codigoVendedor,
                    nombre: String(row[nombreHeader] || '').trim() || `VENDEDOR ${codigoVendedor}`
                });
                vendedorMap[codigoVendedor] = vendedor;
                resumen.vendedores_creados.push(codigoVendedor);
            } catch (err) {
                resumen.errores.push({
                    codigo_vendedor: codigoVendedor,
                    motivo: `No se pudo crear vendedor: ${err.message}`
                });
                continue;
            }
        }

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

            try {
                // Crear cuotaProveedor para este vendedor+proveedor+periodo
                const cuotaProveedor = await models.cuotaProveedor_model.create({
                    cuota:        BigInt(Math.round(cuotaNum)),
                    fecha_inicio,
                    fecha_fin
                });

                // Upsert de la asignación vendedor <-> proveedor <-> cuota
                await models.vendedorCuotaProveedor_model.upsert({
                    id_vendedor:      vendedor.id_vendedor,
                    id_proveedor:     proveedor.id_proveedor,
                    id_cuotaProveedor: cuotaProveedor.id_cuotaProveedor,
                    estado:           true
                });

                resumen.cuotas_creadas++;
            } catch (err) {
                resumen.errores.push({
                    codigo_vendedor: codigoVendedor,
                    proveedor:       colProveedor,
                    motivo:          err.message
                });
            }
        }
    }

    return resumen;
}

module.exports = { importFromBuffer };
