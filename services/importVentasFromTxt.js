const fs = require("fs");
const readline = require("readline");
const { Op } = require("sequelize");

const {
  cleanString,
  parseDateDDMMYYYY,
  parseEsNumber,
  extractTipoCodigo,
  isTotalLine,
} = require("../utils/txtParsers");

function parseLine(cols) {
  // Orden según tu TXT:
  // 0 LINEA, 1 CATEGORIA, 2 CANAL, 3 Codigo vendedor, 4 Nombre vendedor, 5 Nro documento (venta),
  // 6 Item, 7 Desc item, 8 U.M. Orden, 9 Fecha, 10 Cliente factura, 11 Sucursal factura,
  // 12 Razon social, 13 Direccion 1, 14 Ciudad, 15 Cant emp, 16 Cant, 17 Costo prom,
  // 18 Valor bruto, 19 Valor desc, 20 Valor sub, 21 Impuestos, 22 Neto, 23 Margen,
  // 24 Imp afecta margen, 25 Factor UM emp, 26 Factor UM orden, 27 Peso kilo,
  // 28 Barrio, 29 Detalle tipo negocio, 30 Cond pago, 31 Nombre establecimiento,
  // 32 Tipo negocio, 33 Subcanal, 34 Subcanal detallado, 35 Megacategoria, 36 Subcategoria
  return {
    linea: cleanString(cols[0]),
    categoria_txt: cleanString(cols[1]),
    canal: cleanString(cols[2]),
    codigo_vendedor: cleanString(cols[3]),
    nombre_vendedor: cleanString(cols[4]),
    numero_documento_venta: cleanString(cols[5]),

    item_codigo: cleanString(cols[6]),
    item_desc: cleanString(cols[7]),
    um_orden: cleanString(cols[8]),
    fecha: parseDateDDMMYYYY(cols[9]),

    cliente_factura: cleanString(cols[10]),
    sucursal_factura: cleanString(cols[11]),
    razon_social_cliente: cleanString(cols[12]),
    direccion_1: cleanString(cols[13]),
    ciudad: cleanString(cols[14]),

    cantidad_emp: parseEsNumber(cols[15]),
    cantidad: parseEsNumber(cols[16]),
    costo_promedio_total: parseEsNumber(cols[17]),
    valor_bruto: parseEsNumber(cols[18]),
    valor_descuentos: parseEsNumber(cols[19]),
    valor_subtotal: parseEsNumber(cols[20]),
    valor_impuestos: parseEsNumber(cols[21]),
    valor_neto: parseEsNumber(cols[22]),
    margen_promedio: parseEsNumber(cols[23]),
    impuesto_afecta_margen: parseEsNumber(cols[24]),
    factor_um_emp: parseEsNumber(cols[25]),
    factor_um_orden: parseEsNumber(cols[26]),
    peso_kilo: parseEsNumber(cols[27]),

    barrio: cleanString(cols[28]),
    detalle_tipo_negocio: cleanString(cols[29]),
    cond_pago_fact: cleanString(cols[30]),
    nombre_establecimiento: cleanString(cols[31]),
    tipo_negocio: cleanString(cols[32]),
    subcanal: cleanString(cols[33]),
    subcanal_detallado: cleanString(cols[34]),
    megacategoria: cleanString(cols[35]),
    subcategoria: cleanString(cols[36]),
  };
}

async function ensureTiposDocumento(db, tipoCodigos) {
  const TiposDocumento = db.tipos_documento_model;

  const unique = [...new Set(tipoCodigos.filter(Boolean))];
  if (!unique.length) return new Map();

  const existing = await TiposDocumento.findAll({
    where: { codigo: { [Op.in]: unique } },
    attributes: ["id", "codigo"],
  });

  const have = new Set(existing.map((r) => r.codigo.trim()));
  const missing = unique.filter((c) => !have.has(c));

  if (missing.length) {
    await TiposDocumento.bulkCreate(
      missing.map((codigo) => ({
        codigo,
        descripcion: codigo,
        afecta_venta: true,
      })),
      { validate: false },
    );
  }

  const all = await TiposDocumento.findAll({
    where: { codigo: { [Op.in]: unique } },
    attributes: ["id", "codigo"],
  });

  const map = new Map();
  for (const r of all) map.set(r.codigo.trim(), r.id);
  return map;
}

async function ensureVendedores(db, vendedores) {
  const Vendedores = db.vendedores_model;

  const uniqueCodigos = [
    ...new Set(vendedores.map((v) => v.codigo).filter(Boolean)),
  ];
  if (!uniqueCodigos.length) return new Map();

  const existing = await Vendedores.findAll({
    where: { codigo: { [Op.in]: uniqueCodigos } },
    attributes: ["id", "codigo"],
  });

  const have = new Set(existing.map((r) => r.codigo.trim()));
  const missing = vendedores
    .filter((v) => v.codigo && !have.has(v.codigo))
    // dedupe por codigo para no repetir
    .reduce((acc, v) => {
      if (!acc.some((x) => x.codigo === v.codigo)) acc.push(v);
      return acc;
    }, []);

  if (missing.length) {
    await Vendedores.bulkCreate(
      missing.map((v) => ({
        codigo: v.codigo,
        nombre: v.nombre || v.codigo,
        status: true,
      })),
      { validate: false },
    );
  }

  const all = await Vendedores.findAll({
    where: { codigo: { [Op.in]: uniqueCodigos } },
    attributes: ["id", "codigo"],
  });

  const map = new Map();
  for (const r of all) map.set(r.codigo.trim(), r.id);
  return map;
}

async function ensureClientes(db, clientes) {
  const Clientes = db.clientes_model;

  const uniqueNros = [
    ...new Set(clientes.map((c) => c.nro_documento).filter(Boolean)),
  ];
  if (!uniqueNros.length) return new Map();

  const existing = await Clientes.findAll({
    where: { nro_documento: { [Op.in]: uniqueNros } },
    attributes: ["id", "nro_documento"],
  });

  const have = new Set(existing.map((r) => r.nro_documento.trim()));
  const missing = clientes
    .filter((c) => c.nro_documento && !have.has(c.nro_documento))
    .reduce((acc, c) => {
      if (!acc.some((x) => x.nro_documento === c.nro_documento)) acc.push(c);
      return acc;
    }, []);

  if (missing.length) {
    await Clientes.bulkCreate(missing, { validate: false });
  }

  const all = await Clientes.findAll({
    where: { nro_documento: { [Op.in]: uniqueNros } },
    attributes: ["id", "nro_documento"],
  });

  const map = new Map();
  for (const r of all) map.set(r.nro_documento.trim(), r.id);
  return map;
}

async function ensureUnidadesMedida(db, codigos) {
  const Unidades = db.unidades_medida_model;

  const unique = [...new Set(codigos.filter(Boolean))];
  if (!unique.length) return new Map();

  const existing = await Unidades.findAll({
    where: { codigo: { [Op.in]: unique } },
    attributes: ["id", "codigo"],
  });

  const have = new Set(existing.map((r) => r.codigo.trim()));
  const missing = unique.filter((c) => !have.has(c));

  if (missing.length) {
    await Unidades.bulkCreate(
      missing.map((codigo) => ({ codigo })),
      { validate: false },
    );
  }

  const all = await Unidades.findAll({
    where: { codigo: { [Op.in]: unique } },
    attributes: ["id", "codigo"],
  });

  const map = new Map();
  for (const r of all) map.set(r.codigo.trim(), r.id);
  return map;
}

async function ensureCategorias(db, cats) {
  const Categorias = db.categorias_model;

  // Llave compuesta texto para dedupe
  const key = (c) =>
    `${c.categoria || ""}|${c.megacategoria || ""}|${c.subcategoria || ""}`.trim();
  const uniqueByKey = new Map();
  for (const c of cats) {
    const k = key(c);
    if (!uniqueByKey.has(k)) uniqueByKey.set(k, c);
  }
  const unique = [...uniqueByKey.values()].filter(
    (c) => c.categoria || c.megacategoria || c.subcategoria,
  );
  if (!unique.length) return new Map();

  // Buscar existentes: como no tienes unique index compuesto en el modelo, hacemos búsqueda amplia por OR
  // (para ahorrar, podrías crear un índice/unique compuesto en DB; si lo haces, te lo adapto a ON CONFLICT).
  const existing = await Categorias.findAll({
    where: {
      [Op.or]: unique.map((c) => ({
        categoria: c.categoria,
        megacategoria: c.megacategoria,
        subcategoria: c.subcategoria,
      })),
    },
    attributes: ["id", "categoria", "megacategoria", "subcategoria"],
  });

  const have = new Set(existing.map((r) => key(r)));
  const missing = unique.filter((c) => !have.has(key(c)));

  if (missing.length) {
    await Categorias.bulkCreate(missing, { validate: false });
  }

  const all = await Categorias.findAll({
    where: {
      [Op.or]: unique.map((c) => ({
        categoria: c.categoria,
        megacategoria: c.megacategoria,
        subcategoria: c.subcategoria,
      })),
    },
    attributes: ["id", "categoria", "megacategoria", "subcategoria"],
  });

  const map = new Map();
  for (const r of all) map.set(key(r), r.id);
  return map;
}

async function ensureProductos(db, productos) {
  const Productos = db.productos_model;

  const uniqueCodigos = [
    ...new Set(productos.map((p) => p.codigo).filter(Boolean)),
  ];
  if (!uniqueCodigos.length) return new Map();

  const existing = await Productos.findAll({
    where: { codigo: { [Op.in]: uniqueCodigos } },
    attributes: ["id", "codigo"],
  });

  const have = new Set(existing.map((r) => r.codigo.trim()));
  const missing = productos
    .filter((p) => p.codigo && !have.has(p.codigo))
    .reduce((acc, p) => {
      if (!acc.some((x) => x.codigo === p.codigo)) acc.push(p);
      return acc;
    }, []);

  if (missing.length) {
    await Productos.bulkCreate(missing, { validate: false });
  }

  const all = await Productos.findAll({
    where: { codigo: { [Op.in]: uniqueCodigos } },
    attributes: ["id", "codigo"],
  });

  const map = new Map();
  for (const r of all) map.set(r.codigo.trim(), r.id);
  return map;
}

async function ensureVentas(db, ventasRows) {
  const Ventas = db.ventas_model;

  const uniqueDocs = [
    ...new Set(ventasRows.map((v) => v.numero_documento).filter(Boolean)),
  ];
  if (!uniqueDocs.length) return new Map();

  const existing = await Ventas.findAll({
    where: { numero_documento: { [Op.in]: uniqueDocs } },
    attributes: ["id", "numero_documento"],
  });

  const have = new Set(existing.map((r) => r.numero_documento.trim()));
  const missing = ventasRows
    .filter((v) => v.numero_documento && !have.has(v.numero_documento))
    .reduce((acc, v) => {
      if (!acc.some((x) => x.numero_documento === v.numero_documento))
        acc.push(v);
      return acc;
    }, []);

  if (missing.length) {
    await Ventas.bulkCreate(missing, { validate: false });
  }

  const all = await Ventas.findAll({
    where: { numero_documento: { [Op.in]: uniqueDocs } },
    attributes: ["id", "numero_documento"],
  });

  const map = new Map();
  for (const r of all) map.set(r.numero_documento.trim(), r.id);
  return map;
}

async function processBatch(db, batchLines) {
  // Preparar colecciones únicas para minimizar I/O
  const tipoCodigos = [];
  const vendedores = [];
  const clientes = [];
  const umCodigos = [];
  const categorias = [];
  const productos = [];
  const ventasRows = [];

  for (const row of batchLines) {
    const tipoCodigo = extractTipoCodigo(row.numero_documento_venta);
    tipoCodigos.push(tipoCodigo);

    vendedores.push({
      codigo: row.codigo_vendedor,
      nombre: row.nombre_vendedor,
    });
    clientes.push({
      nro_documento: row.cliente_factura, // acuerdo: Cliente factura es el ID único del cliente
      razon_social: row.razon_social_cliente,
      direccion: row.direccion_1,
      ciudad: row.ciudad,
      barrio: row.barrio,
      condicion_pago: row.cond_pago_fact,
      tipo_negocio: row.tipo_negocio,
      subcanal: row.subcanal,
      subcanal_detallado: row.subcanal_detallado,
    });

    if (row.um_orden) umCodigos.push(row.um_orden);

    categorias.push({
      categoria: row.categoria_txt,
      megacategoria: row.megacategoria,
      subcategoria: row.subcategoria,
    });

    // producto.codigo es unique
    productos.push({
      codigo: row.item_codigo,
      descripcion: row.item_desc,
      // categoria_id se completa después de mapear categorías
    });

    // ventas: numero_documento unique y tipo_documento_id NOT NULL
    ventasRows.push({
      numero_documento: row.numero_documento_venta,
      fecha: row.fecha,
      // tipo_documento_id, cliente_id, vendedor_id se completan después de mapear
      sucursal: row.sucursal_factura,
      canal: row.canal,
      nombre_establecimiento: row.nombre_establecimiento,
    });
  }

  // 1) Tipos documento, vendedores, clientes, UM, categorías
  const tipoMap = await ensureTiposDocumento(db, tipoCodigos);
  const vendedorMap = await ensureVendedores(db, vendedores);
  const clienteMap = await ensureClientes(db, clientes);
  const umMap = await ensureUnidadesMedida(db, umCodigos);
  const categoriaMap = await ensureCategorias(db, categorias);

  // 2) Productos (con categoria_id)
  const catKey = (c) =>
    `${c.categoria || ""}|${c.megacategoria || ""}|${c.subcategoria || ""}`.trim();
  const productosConCat = productos.map((p, idx) => {
    const row = batchLines[idx];
    const cId = categoriaMap.get(
      catKey({
        categoria: row.categoria_txt,
        megacategoria: row.megacategoria,
        subcategoria: row.subcategoria,
      }),
    );
    return { ...p, categoria_id: cId || null };
  });

  const productoMap = await ensureProductos(db, productosConCat);

  // 3) Ventas (con FK ids)
  const ventasConFk = ventasRows.map((v, idx) => {
    const row = batchLines[idx];
    const tipoCodigo = extractTipoCodigo(row.numero_documento_venta);
    return {
      ...v,
      tipo_documento_id: tipoMap.get(tipoCodigo),
      cliente_id: clienteMap.get(row.cliente_factura),
      vendedor_id: vendedorMap.get(row.codigo_vendedor),
    };
  });

  const ventaMap = await ensureVentas(db, ventasConFk);

  // ANTES de insertar nuevos detalles, borramos los existentes para las ventas de este batch.
  // Esto previene duplicados si se re-importa el mismo archivo.
  const ventaIds = [...new Set([...ventaMap.values()])];
  if (ventaIds.length > 0) {
    await db.ventas_detalle_model.destroy({
      where: {
        venta_id: {
          [Op.in]: ventaIds,
        },
      },
    });
  }

  // 4) Detalles (bulk)
  const detalles = batchLines.map((row) => ({
    venta_id: ventaMap.get(row.numero_documento_venta),
    producto_id: productoMap.get(row.item_codigo),
    linea: row.linea,
    unidad_medida_id: row.um_orden ? umMap.get(row.um_orden) : null,
    cantidad_emp: row.cantidad_emp,
    cantidad: row.cantidad,
    costo_promedio_total: row.costo_promedio_total,
    valor_bruto: row.valor_bruto,
    valor_descuentos: row.valor_descuentos,
    valor_subtotal: row.valor_subtotal,
    valor_impuestos: row.valor_impuestos,
    valor_neto: row.valor_neto,
    margen_promedio: row.margen_promedio,
    impuesto_afecta_margen: row.impuesto_afecta_margen,
    factor_um_emp: row.factor_um_emp,
    factor_um_orden: row.factor_um_orden,
    peso_kilo: row.peso_kilo,
  }));

  await db.ventas_detalle_model.bulkCreate(detalles, { validate: false });
  return detalles.length;
}

async function importVentasFromTxtFile(db, filePath, options = {}) {
  const BATCH_SIZE = options.batchSize ?? 1500; // empezar moderado en Neon free
  const encoding = options.encoding ?? "utf8";

  let insertedDetalles = 0;
  let skipped = 0;
  let lineNumber = 0;
  let processedLines = 0;

  const stream = fs.createReadStream(filePath, { encoding });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let batch = [];

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    // header
    if (lineNumber === 1) continue;

    const cols = line.split("\t");
    if (isTotalLine(cols)) {
      skipped++;
      continue;
    }

    const row = parseLine(cols);
    // documento venta obligatorio
    if (!row.numero_documento_venta) {
      skipped++;
      continue;
    }
    processedLines++;
    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      insertedDetalles += await processBatch(db, batch);
      batch = [];
    }
  }

  if (batch.length) {
    insertedDetalles += await processBatch(db, batch);
  }

  return { processedLines, insertedDetalles, skipped, lineNumber };
}

module.exports = { importVentasFromTxtFile };
