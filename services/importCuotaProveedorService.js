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

    // Columnas de proveedores = todo después de codigo_vendedor y nombre_vendedor
    const FIXED_COLS    = ['codigo_vendedor', 'nombre_vendedor'];
    const proveedorCols = headers.filter(h => !FIXED_COLS.includes(h.toLowerCase()));

    if (proveedorCols.length === 0) {
        throw new Error('No se encontraron columnas de proveedores en el archivo.');
    }

    // Precargar todos los proveedores del CSV (búsqueda por nombre, case-insensitive)
    const proveedoresDB = await models.proveedor_model.findAll({
        where: {
            nombre: { [Op.iLike]: { [Op.any]: proveedorCols.map(c => c.trim()) } }
        },
        attributes: ['id_proveedor', 'nombre']
    });

    // Mapa nombre_upper → proveedor
    const proveedorMap  = {};
    proveedoresDB.forEach(p => { proveedorMap[p.nombre.toUpperCase()] = p; });

    // Advertir si algún proveedor del CSV no existe en la BD
    const proveedoresNoEncontrados = proveedorCols.filter(c => !proveedorMap[c.toUpperCase()]);
    const proveedoresEncontrados   = proveedorCols.filter(c =>  proveedorMap[c.toUpperCase()]);

    // Precargar todos los vendedores involucrados
    const codigosVendedor = [...new Set(rows.map(r => r['codigo_vendedor'] || r['CODIGO_VENDEDOR']).filter(Boolean))];
    const vendedoresDB    = await models.vendedor_model.findAll({
        where: { codigo_vendedor: { [Op.in]: codigosVendedor } },
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });
    const vendedorMap = {};
    vendedoresDB.forEach(v => { vendedorMap[v.codigo_vendedor] = v; });

    // Contadores
    const resumen = {
        fecha_inicio,
        fecha_fin,
        filas_procesadas:   0,
        cuotas_creadas:     0,
        cuotas_omitidas:    0,
        errores:            [],
        proveedores_no_encontrados: proveedoresNoEncontrados,
        proveedores_procesados:     proveedoresEncontrados
    };

    // Procesar fila por fila
    for (const row of rows) {
        const codigoVendedor = row['codigo_vendedor'] || row['CODIGO_VENDEDOR'] || '';
        if (!codigoVendedor) continue;

        const vendedor = vendedorMap[codigoVendedor];
        if (!vendedor) {
            resumen.errores.push({
                codigo_vendedor: codigoVendedor,
                motivo: 'Vendedor no encontrado en la base de datos'
            });
            continue;
        }

        resumen.filas_procesadas++;

        for (const colProveedor of proveedoresEncontrados) {
            const valorCrudo = row[colProveedor] ?? '';
            if (isSinCuota(valorCrudo)) {
                resumen.cuotas_omitidas++;
                continue;
            }

            const cuotaNum = parseFloat(valorCrudo.replace(',', '.'));
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
