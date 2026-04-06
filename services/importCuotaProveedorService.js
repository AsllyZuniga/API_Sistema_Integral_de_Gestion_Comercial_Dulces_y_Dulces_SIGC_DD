'use strict';

const { Op } = require('sequelize');
const models = require('../models');

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectDelimiter(headerLine) {
    if (headerLine.includes('|')) return '|';
    if (headerLine.includes('\t')) return '\t';
    return ',';
}

function parseCsv(content) {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length < 2) throw new Error('El archivo debe tener al menos una fila de encabezados y una de datos.');

    const delimiter = detectDelimiter(nonEmpty[0]);
    const headers = nonEmpty[0].split(delimiter).map(h => h.trim());
    const rows = nonEmpty.slice(1).map(line => {
        const cells = line.split(delimiter).map(c => c.trim());
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
    const vendedoresDB = await models.vendedor_model.findAll({
        where: { codigo_vendedor: { [Op.in]: codigosVendedor } },
        attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
    });
    const vendedorMap = {};
    vendedoresDB.forEach(v => { vendedorMap[String(v.codigo_vendedor).trim()] = v; });

    // Resolver ids de proveedores para consultas masivas posteriores
    const proveedorIds = Object.values(proveedorMap)
        .map(p => p.id_proveedor)
        .filter(Boolean);

    // Contadores
    const resumen = {
        fecha_inicio,
        fecha_fin,
        filas_procesadas: 0,
        cuotas_creadas: 0,
        cuotas_omitidas: 0,
        errores: [],
        proveedores_no_encontrados: [],
        proveedores_procesados: proveedorCols,
        proveedores_creados: proveedoresCreados,
        vendedores_creados: []
    };

    // --- Bulk processing ---
    // 1. Crear vendedores faltantes en bulk
    const nuevosVendedores = [];
    for (const row of rows) {
        const codigoVendedor = String(row[codigoHeader] || '').trim();
        if (!codigoVendedor) continue;
        if (!vendedorMap[codigoVendedor]) {
            nuevosVendedores.push({
                codigo_vendedor: codigoVendedor,
                nombre: String(row[nombreHeader] || '').trim() || `VENDEDOR ${codigoVendedor}`
            });
        }
    }
    if (nuevosVendedores.length > 0) {
        try {
            await models.vendedor_model.bulkCreate(nuevosVendedores, { ignoreDuplicates: true });

            // Recargar vendedores para garantizar id_vendedor incluso con duplicados ignorados
            const vendedoresActualizados = await models.vendedor_model.findAll({
                where: { codigo_vendedor: { [Op.in]: codigosVendedor } },
                attributes: ['id_vendedor', 'codigo_vendedor', 'nombre']
            });

            vendedoresActualizados.forEach(v => {
                const codigo = String(v.codigo_vendedor).trim();
                if (!vendedorMap[codigo]) {
                    resumen.vendedores_creados.push(v.codigo_vendedor);
                }
                vendedorMap[codigo] = v;
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
                    where: { fecha_inicio, fecha_fin },
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
        const codigoVendedor = String(row[codigoHeader] || '').trim();
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
                fecha_inicio,
                fecha_fin,
                _meta: {
                    id_vendedor: vendedor.id_vendedor,
                    id_proveedor: proveedor.id_proveedor
                }
            });
        }
    }

    // 3. Bulk create de cuotasProveedor
    let cuotasProveedorCreadas = [];
    if (cuotasProveedorBulk.length > 0) {
        try {
            // El _meta no se guarda, solo para mapear luego
            cuotasProveedorCreadas = await models.cuotaProveedor_model.bulkCreate(
                cuotasProveedorBulk.map(q => {
                    const { _meta, ...rest } = q; return rest;
                }),
                { returning: true }
            );
        } catch (err) {
            resumen.errores.push({ motivo: `Error en bulkCreate de cuotasProveedor: ${err.message}` });
        }
    }

    // 4. Mapear cuotasProveedor a asignaciones
    let idx = 0;
    const asignacionPorClave = new Map();
    for (const q of cuotasProveedorBulk) {
        if (cuotasProveedorCreadas[idx]) {
            const key = `${q._meta.id_vendedor}|${q._meta.id_proveedor}`;
            const asignacion = {
                id_vendedor: q._meta.id_vendedor,
                id_proveedor: q._meta.id_proveedor,
                id_cuotaProveedor: cuotasProveedorCreadas[idx].id_cuotaProveedor,
                estado: true
            };

            const idExistente = asignacionExistentePorClave.get(key);
            if (idExistente) {
                asignacion.id_vendedor_cuota_proveedor = idExistente;
            }

            // Si en el archivo viene repetido vendedor/proveedor, prevalece la última cuota
            asignacionPorClave.set(key, asignacion);
        }
        idx++;
    }

    asignacionesBulk.push(...asignacionPorClave.values());
    resumen.cuotas_creadas = asignacionesBulk.length;

    // 5. Bulk upsert de asignaciones (no existe bulkUpsert en Sequelize, así que se hace bulkCreate con updateOnDuplicate)
    if (asignacionesBulk.length > 0) {
        try {
            await models.vendedorCuotaProveedor_model.bulkCreate(
                asignacionesBulk,
                { updateOnDuplicate: ['id_cuotaProveedor', 'estado'] }
            );
        } catch (err) {
            resumen.errores.push({ motivo: `Error en bulkCreate de asignaciones: ${err.message}` });
        }
    }

    return resumen;
}

module.exports = { importFromBuffer };
