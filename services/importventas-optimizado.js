const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const parse = require('csv-parse/sync').parse;
const iconv = require('iconv-lite');

class ImportadorVentasOptimizado {
    constructor(sequelize, models) {
        this.sequelize = sequelize;

        this.proveedor = models.proveedor_model;
        this.megacategoria = models.megacategoria_model;
        this.categoria = models.categoria_model;
        this.subcategoria = models.subcategoria_model;
        this.canal = models.canal_model;
        this.subcanal = models.subcanal_model;
        this.vendedor = models.vendedor_model;
        this.ciudad = models.ciudad_model;
        this.barrio = models.barrio_model;
        this.tipo_negocio = models.tipo_negocio_model;
        this.tipo_documento = models.tipo_documento_model;
        this.cliente = models.cliente_model;
        this.item = models.item_model;
        this.obsequio = models.obsequio_model;
        this.venta = models.venta_model;
        this.detalle_venta = models.detalle_venta_model;

        this.maestros = {
            proveedores: new Map(),
            megacategorias: new Map(),
            categorias: new Map(),
            subcategorias: new Map(),
            canales: new Map(),
            subcanales: new Map(),
            vendedores: new Map(),
            ciudades: new Map(),
            barrios: new Map(),
            tiposNegocio: new Map(),
            tiposDocumento: new Map(),
            clientes: new Map(),
            items: new Map(),
            obsequios: new Map()
        };

        this.nuevosCreados = {
            proveedores: new Map(),
            megacategorias: new Map(),
            categorias: new Map(),
            subcategorias: new Map(),
            canales: new Map(),
            subcanales: new Map(),
            vendedores: new Map(),
            ciudades: new Map(),
            barrios: new Map(),
            tiposNegocio: new Map(),
            tiposDocumento: new Map(),
            clientes: new Map(),
            items: new Map(),
            obsequios: new Map()
        };

        this.archivosEnProceso = new Set();
        this.archivosImportados = new Set();

        this.BATCH_INSERT_SIZE = 10000; // batch de carga general
        this.BATCH_UPSERT_DETALLE_SIZE = 1000; // batch para upsert de detalle_venta
        this.TRANSACTION_SIZE = 5000;
        this.BULK_DISPLAY_INTERVAL = 5000;

        this.COLUMNAS_REQUERIDAS = [
            'LINEA',
            'MEGACATEGORIA',
            'CATEGORIA',
            'SUBCATEGORIA',
            'CANAL',
            'SUBCANAL',
            'Desc. ciudad',
            'Barrio',
            'TIPO DE NEGOCIO',
            'DETALLE TIPO DE NEGOCIO',
            'Nro documento',
            'Codigo vendedor',
            'Nombre vendedor',
            'Cliente factura',
            'Razon social cliente factura',
            'Sucursal factura',
            'Direccion 1',
            'Item',
            'Desc. item',
            'Cantidad emp.',
            'Factor U.M. emp.',
            'Factor U.M. Orden',
            'Peso en KILO',
            'REPORTE PROV CON OBS',
            'Valor bruto',
            'Valor descuentos',
            'Valor impuestos',
            'Valor neto',
            'Valor subtotal',
            'Margen promedio',
            'Impuesto afecta margen',
            'Cond. pago fact',
            'Fecha',
            'Cantidad',
            'Costo promedio total'
        ];

        this.verbose = false;

        this.estadisticas = {
            totalLineas: 0,
            exitosas: 0,
            errores: 0,
            erroresDetallados: [],
            nuevosProveedores: 0,
            nuevasMegacategorias: 0,
            nuevasVentas: 0,
            tiempoInicio: null,
            tiempoFin: null,
            maestrosPreCargados: {}
        };
    }

    normalizarValor(valor) {
        if (valor === undefined || valor === null) return null;
        valor = String(valor).trim();
        // Permitir valores negativos, por ejemplo: -$1.234,56 o -1.234,56
        // Quitar el signo y el símbolo de peso
        let negativo = false;
        if (valor.startsWith('-')) {
            negativo = true;
            valor = valor.substring(1).trim();
        }
        if (valor.startsWith('$')) valor = valor.substring(1);
        valor = valor.replace(/\./g, '').replace(',', '.');
        let numero = parseFloat(valor);
        if (negativo) numero = -numero;
        if (valor === '0' || valor === '0,00' || valor === '$0,00') return 0;
        return isNaN(numero) ? null : numero;
    }

    valorClave(valor) {
        if (valor === undefined || valor === null) return 'NULL';
        return String(valor).trim();
    }

    construirClaveVentaDetalle(ventaData, detalleData) {
        return [
            this.valorClave(ventaData.numero_documento),
            this.valorClave(ventaData.fecha),
            this.valorClave(ventaData.id_cliente),
            this.valorClave(ventaData.id_vendedor),
            this.valorClave(ventaData.id_tipo_documento),
            this.valorClave(ventaData.subtotal),
            this.valorClave(ventaData.valor_neto),
            this.valorClave(detalleData.id_item),
            this.valorClave(detalleData.cantidad),
            this.valorClave(detalleData.cantidad_emp),
            this.valorClave(detalleData.precio_unitario),
            this.valorClave(detalleData.subtotal)
        ].join('|');
    }

    async obtenerClavesExistentesEnDB(pares) {
        if (!pares || pares.length === 0) return new Set();

        const fechas = [...new Set(pares.map(p => p.ventaData.fecha).filter(Boolean))];
        const documentos = [...new Set(pares.map(p => p.ventaData.numero_documento).filter(Boolean))];
        const vendedores = [...new Set(pares.map(p => p.ventaData.id_vendedor).filter(Boolean))];

        if (fechas.length === 0 || documentos.length === 0 || vendedores.length === 0) {
            return new Set();
        }

        const rows = await this.sequelize.query(`
            SELECT
                v.numero_documento,
                v.fecha,
                v.id_cliente,
                v.id_vendedor,
                v.id_tipo_documento,
                v.subtotal,
                v.valor_neto,
                d.id_item,
                d.cantidad,
                d.cantidad_emp,
                d.precio_unitario,
                d.subtotal AS detalle_subtotal
            FROM venta v
            JOIN detalle_venta d ON d.id_venta = v.id_venta
            WHERE v.fecha IN (:fechas)
              AND v.numero_documento IN (:documentos)
              AND v.id_vendedor IN (:vendedores)
        `, {
            replacements: { fechas, documentos, vendedores },
            type: QueryTypes.SELECT
        });

        const claves = new Set();
        rows.forEach((r) => {
            const ventaData = {
                numero_documento: r.numero_documento,
                fecha: r.fecha,
                id_cliente: r.id_cliente,
                id_vendedor: r.id_vendedor,
                id_tipo_documento: r.id_tipo_documento,
                subtotal: r.subtotal,
                valor_neto: r.valor_neto
            };
            const detalleData = {
                id_item: r.id_item,
                cantidad: r.cantidad,
                cantidad_emp: r.cantidad_emp,
                precio_unitario: r.precio_unitario,
                subtotal: r.detalle_subtotal
            };
            claves.add(this.construirClaveVentaDetalle(ventaData, detalleData));
        });

        return claves;
    }

    parsearFecha(valor) {
        if (!valor || valor.trim() === '') return null;
        valor = valor.trim();
        const partes = valor.split('/');
        if (partes.length === 3) {
            const dia = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10);
            const anio = parseInt(partes[2], 10);
            const fecha = new Date(anio, mes - 1, dia);
            if (fecha.getDate() === dia && fecha.getMonth() === mes - 1 && fecha.getFullYear() === anio) {
                return fecha.toISOString().split('T')[0];
            }
        }
        if (valor.match(/^\d{4}-\d{2}-\d{2}$/)) return valor;
        return null;
    }

    separarCodigoNombre(valor) {
        if (!valor) return { codigo: null, nombre: null };
        const partes = valor.split('-').map(p => p.trim());
        if (partes.length >= 2) {
            return { codigo: partes[0], nombre: partes.slice(1).join('-') };
        }
        return { codigo: null, nombre: valor.trim() };
    }

    separarTipoDocumento(valor) {
        if (!valor) return { nombre: null, consecutivo: null };
        const partes = valor.split('-');
        if (partes.length === 2) {
            return { nombre: partes[0].trim(), consecutivo: parseInt(partes[1], 10) };
        }
        return { nombre: null, consecutivo: null };
    }

    parsearLinea(linea, encabezados, delimitador = '\t') {
        // Manejar comillas en CSV
        let valores;
        if (delimitador === ',') {
            // Separar por coma, respetando comillas
            valores = this.parseCSVLine(linea);
        } else {
            valores = linea.split(delimitador);
        }
        const registro = {};
        encabezados.forEach((encabezado, index) => {
            registro[encabezado.trim()] = valores[index] ? valores[index].trim() : '';
        });
        return registro;
    }

    // Simple CSV parser for a line (handles quoted commas)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    validarEncabezados(encabezados) {
        const normalizar = (texto) => String(texto || '').trim().toLowerCase();
        const encabezadosNormalizados = new Set(encabezados.map(normalizar));

        const faltantes = this.COLUMNAS_REQUERIDAS
            .filter((columna) => !encabezadosNormalizados.has(normalizar(columna)));

        if (faltantes.length > 0) {
            throw new Error(
                `Faltan columnas requeridas en el archivo: ${faltantes.join(', ')}. ` +
                `Columnas esperadas: ${this.COLUMNAS_REQUERIDAS.join(', ')}`
            );
        }
    }

    validarArchivoPlano(rutaArchivo) {
        const extension = path.extname(String(rutaArchivo || '')).toLowerCase();
        if (extension !== '.txt' && extension !== '.csv' && extension !== '.tsv') {
            throw new Error('El archivo seleccionado no es válido. Solo se permiten archivos con extensión .txt, .csv o .tsv');
        }
        return extension;
    }

    async obtenerHashArchivo(rutaArchivo) {
        return await new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(rutaArchivo);

            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', (error) => reject(error));
        });
    }

    async validarArchivoNoDuplicado(rutaArchivo) {
        const hashArchivo = await this.obtenerHashArchivo(rutaArchivo);

        if (this.archivosEnProceso.has(hashArchivo) || this.archivosImportados.has(hashArchivo)) {
            throw new Error('El archivo seleccionado ya fue cargado previamente en esta importación. No se permite importar el mismo archivo dos veces para evitar duplicados.');
        }

        this.archivosEnProceso.add(hashArchivo);
        return hashArchivo;
    }

    async precargaDatos() {
        console.log('📦 Precargando datos maestros...');

        try {
            const proveedores = await this.proveedor.findAll({ raw: true });
            const megacategorias = await this.megacategoria.findAll({ raw: true });
            const categorias = await this.categoria.findAll({ raw: true });
            const subcategorias = await this.subcategoria.findAll({ raw: true });
            const canales = await this.canal.findAll({ raw: true });
            const subcanales = await this.subcanal.findAll({ raw: true });
            const vendedores = await this.vendedor.findAll({ raw: true });
            const ciudades = await this.ciudad.findAll({ raw: true });
            const barrios = await this.barrio.findAll({ raw: true });
            const tiposNegocio = await this.tipo_negocio.findAll({ raw: true });
            const tiposDocumento = await this.tipo_documento.findAll({ raw: true });
            const clientes = await this.cliente.findAll({ raw: true });
            const items = await this.item.findAll({ raw: true });
            const obsequios = await this.obsequio.findAll({ raw: true });

            proveedores.forEach(p => {
                const clave = (p.codigo?.toLowerCase()) || (p.nombre?.toLowerCase()) || 'null';
                this.maestros.proveedores.set(clave, p);
            });
            megacategorias.forEach(m => {
                const clave = m.nombre?.toLowerCase() || 'null';
                this.maestros.megacategorias.set(clave, m);
            });
            categorias.forEach(c => {
                const key = `${c.nombre}_${c.id_megacategoria}`.toLowerCase();
                this.maestros.categorias.set(key, c);
            });
            subcategorias.forEach(s => {
                const key = `${s.nombre}_${s.id_categoria}`.toLowerCase();
                this.maestros.subcategorias.set(key, s);
            });
            canales.forEach(c => {
                const clave = c.nombre?.toLowerCase() || 'null';
                this.maestros.canales.set(clave, c);
            });
            subcanales.forEach(s => {
                const key = `${s.nombre}_${s.id_canal}`.toLowerCase();
                this.maestros.subcanales.set(key, s);
            });
            vendedores.forEach(v => {
                const clave = v.codigo_vendedor?.toLowerCase() || 'null';
                this.maestros.vendedores.set(clave, v);
            });
            ciudades.forEach(c => {
                const clave = c.nombre?.toLowerCase() || 'null';
                this.maestros.ciudades.set(clave, c);
            });
            barrios.forEach(b => {
                const key = `${b.nombre}_${b.id_ciudad}`.toLowerCase();
                this.maestros.barrios.set(key, b);
            });
            tiposNegocio.forEach(t => {
                const clave = t.tipo_negocio?.toLowerCase() || 'null';
                this.maestros.tiposNegocio.set(clave, t);
            });
            tiposDocumento.forEach(t => {
                const clave = t.nombre?.toLowerCase() || 'null';
                this.maestros.tiposDocumento.set(clave, t);
            });
            clientes.forEach(c => {
                const clave = c.nro_documento?.toLowerCase() || 'null';
                this.maestros.clientes.set(clave, c);
            });
            items.forEach(i => {
                const clave = i.codigo_item?.toLowerCase() || 'null';
                this.maestros.items.set(clave, i);
            });
            obsequios.forEach(o => {
                const key = o.descripcion ? o.descripcion.toLowerCase() : 'null';
                this.maestros.obsequios.set(key, o);
            });

            this.estadisticas.maestrosPreCargados = {
                proveedores: proveedores.length,
                megacategorias: megacategorias.length,
                categorias: categorias.length,
                canales: canales.length,
                ciudades: ciudades.length,
                clientes: clientes.length,
                items: items.length,
                tiposDocumento: tiposDocumento.length
            };

            console.log(`✅ Datos precargados:`);
            console.log(`   • ${proveedores.length} proveedores`);
            console.log(`   • ${megacategorias.length} megacategorías`);
            console.log(`   • ${categorias.length} categorías`);
            console.log(`   • ${canales.length} canales`);
            console.log(`   • ${ciudades.length} ciudades`);
            console.log(`   • ${clientes.length} clientes`);
            console.log(`   • ${items.length} items`);

        } catch (error) {
            throw new Error(`❌ Error precargando datos: ${error.message}`);
        }
    }

    async obtenerOCrearOptimizado(modelo, cacheKey, clave, datosCompletos, transaccion = null) {
        const claveNormalizada = String(clave || '').toLowerCase();

        if (!claveNormalizada) {
            return await modelo.create(datosCompletos, transaccion ? { transaction: transaccion } : undefined);
        }

        if (this.maestros[cacheKey]?.has(claveNormalizada)) {
            return this.maestros[cacheKey].get(claveNormalizada);
        }

        if (this.nuevosCreados[cacheKey]?.has(claveNormalizada)) {
            return this.nuevosCreados[cacheKey].get(claveNormalizada);
        }

        try {
            const nuevoRegistro = await modelo.create(datosCompletos, transaccion ? { transaction: transaccion } : undefined);
            const objeto = nuevoRegistro.get({ plain: true });
            this.nuevosCreados[cacheKey].set(claveNormalizada, objeto);
            return objeto;
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') {
                const existente = await modelo.findOne({
                    where: datosCompletos,
                    raw: true,
                    ...(transaccion ? { transaction: transaccion } : {})
                });

                if (existente) {
                    this.nuevosCreados[cacheKey].set(claveNormalizada, existente);
                    return existente;
                }
            }

            throw error;
        }
    }

    // Resuelve todos los maestros y retorna los datos listos para insertar
    // NO crea venta ni detalle_venta aquí — eso se hace en bulkCreate
    async prepararDatosFila(fila, transaccion) {
        if (!fila || Object.keys(fila).length === 0) throw new Error('Fila vacía');

        const { codigo: codProveedor, nombre: nomProveedor } = this.separarCodigoNombre(fila['LINEA']);
        const { nombre: nomTipoDoc, consecutivo: nroDocumento } = this.separarTipoDocumento(fila['Nro documento']);

        const proveedor = await this.obtenerOCrearOptimizado(
            this.proveedor, 'proveedores',
            nomProveedor,
            { codigo: codProveedor, nombre: nomProveedor },
            transaccion
        );

        const megacategoria = await this.obtenerOCrearOptimizado(
            this.megacategoria, 'megacategorias',
            fila['MEGACATEGORIA'],
            { nombre: fila['MEGACATEGORIA']?.trim() },
            transaccion
        );

        const categoria = await this.obtenerOCrearOptimizado(
            this.categoria, 'categorias',
            `${fila['CATEGORIA']}_${megacategoria?.id_megacategoria}`,
            { nombre: fila['CATEGORIA']?.trim(), id_megacategoria: megacategoria?.id_megacategoria },
            transaccion
        );

        const subcategoria = await this.obtenerOCrearOptimizado(
            this.subcategoria, 'subcategorias',
            `${fila['SUBCATEGORIA']}_${categoria?.id_categoria}`,
            { nombre: fila['SUBCATEGORIA']?.trim(), id_categoria: categoria?.id_categoria },
            transaccion
        );

        const canal = await this.obtenerOCrearOptimizado(
            this.canal, 'canales',
            fila['CANAL'],
            { nombre: fila['CANAL']?.trim() },
            transaccion
        );

        const subcanal = await this.obtenerOCrearOptimizado(
            this.subcanal, 'subcanales',
            `${fila['SUBCANAL']}_${canal?.id_canal}`,
            { nombre: fila['SUBCANAL']?.trim(), id_canal: canal?.id_canal },
            transaccion
        );

        const ciudad = await this.obtenerOCrearOptimizado(
            this.ciudad, 'ciudades',
            fila['Desc. ciudad'],
            { nombre: fila['Desc. ciudad']?.trim() },
            transaccion
        );

        const barrio = await this.obtenerOCrearOptimizado(
            this.barrio, 'barrios',
            `${fila['Barrio']}_${ciudad?.id_ciudad}`,
            { nombre: fila['Barrio']?.trim(), id_ciudad: ciudad?.id_ciudad },
            transaccion
        );

        const tipoNegocio = await this.obtenerOCrearOptimizado(
            this.tipo_negocio, 'tiposNegocio',
            fila['TIPO DE NEGOCIO'],
            {
                tipo_negocio: fila['TIPO DE NEGOCIO']?.trim(),
                detalle_tipo_negocio: fila['DETALLE TIPO DE NEGOCIO']?.trim() || ''
            },
            transaccion
        );

        const tipoDocumentoKey = nomTipoDoc && Number.isFinite(nroDocumento)
            ? `${nomTipoDoc}_${nroDocumento}`
            : fila['Nro documento']?.trim();

        const tipoDocumento = fila['Nro documento'] ?
            await this.obtenerOCrearOptimizado(
                this.tipo_documento, 'tiposDocumento',
                tipoDocumentoKey,
                { nombre: nomTipoDoc, consecutivo: nroDocumento },
                transaccion
            ) : null;

        const vendedor = await this.obtenerOCrearOptimizado(
            this.vendedor, 'vendedores',
            fila['Codigo vendedor'],
            {
                codigo_vendedor: fila['Codigo vendedor']?.trim(),
                nombre: fila['Nombre vendedor']?.trim() || 'SIN NOMBRE'
            },
            transaccion
        );

        const clienteDocumento = fila['Cliente factura']?.trim();
        const clienteRazonSocial = fila['Razon social cliente factura']?.trim() || '';
        const clienteSucursal = fila['Sucursal factura']?.trim() || '';
        const clienteDireccion = fila['Direccion 1']?.trim() || '';
        const clienteClave = clienteDocumento || `${clienteRazonSocial}_${clienteSucursal}_${clienteDireccion}`;

        const cliente = await this.obtenerOCrearOptimizado(
            this.cliente, 'clientes',
            clienteClave,
            {
                nro_documento: clienteDocumento,
                razon_social: clienteRazonSocial,
                sucursal: clienteSucursal,
                direccion: clienteDireccion,
                nombre_establecimiento: clienteRazonSocial,
                id_ciudad: ciudad?.id_ciudad,
                id_barrio: barrio?.id_barrio,
                id_canal: canal?.id_canal,
                id_tipo_negocio: tipoNegocio?.id_tipo_negocio
            },
            transaccion
        );

        const itemCodigo = fila['Item']?.trim();
        const itemDescripcion = fila['Desc. item']?.trim() || '';
        const itemClave = itemCodigo || itemDescripcion;

        const item = await this.obtenerOCrearOptimizado(
            this.item, 'items',
            itemClave,
            {
                codigo_item: itemCodigo,
                descripcion: itemDescripcion,
                id_proveedor: proveedor?.id_proveedor,
                id_megacategoria: megacategoria?.id_megacategoria,
                id_categoria: categoria?.id_categoria,
                id_subcategoria: subcategoria?.id_subcategoria,
                cantidad_empaque: this.normalizarValor(fila['Cantidad emp.']) || 0,
                factor_um_empaque: this.normalizarValor(fila['Factor U.M. emp.']) || 0,
                factor_um_orden: this.normalizarValor(fila['Factor U.M. Orden']) || 0,
                peso_kilo: this.normalizarValor(fila['Peso en KILO']) || 0
            },
            transaccion
        );

        // obsequio: sigue caché, se crea aquí si es nuevo
        if (fila['REPORTE PROV CON OBS'] && fila['REPORTE PROV CON OBS'].trim()) {
            await this.obtenerOCrearOptimizado(
                this.obsequio, 'obsequios',
                fila['REPORTE PROV CON OBS'].trim(),
                {
                    descripcion: fila['REPORTE PROV CON OBS'].trim(),
                    valor_obsequio: this.normalizarValor(fila['Valor subtotal']) || 0
                },
                transaccion
            );
        }

        const ventaData = {
            numero_documento: fila['Nro documento']?.trim(),
            fecha: this.parsearFecha(fila['Fecha']),
            id_cliente: cliente?.id_cliente,
            id_vendedor: vendedor?.id_vendedor,
            id_canal: canal?.id_canal,
            id_subcanal: subcanal?.id_subcanal,
            id_tipo_documento: tipoDocumento?.id_tipo_documento,
            precio_unitario_con_impuesto: this.normalizarValor(fila['Valor bruto']),
            valor_descuentos: this.normalizarValor(fila['Valor descuentos']),
            valor_impuestos: this.normalizarValor(fila['Valor impuestos']),
            valor_neto: this.normalizarValor(fila['Valor neto']),
            subtotal: this.normalizarValor(fila['Valor subtotal']),
            margen_promedio: this.normalizarValor(fila['Margen promedio']) || 0,
            impuesto_afecta_margen: this.normalizarValor(fila['Impuesto afecta margen']),
            condicion_pago: fila['Cond. pago fact']?.trim().substring(0, 20),
            porcentaje_descuento: null,
            porcentaje_impuesto: null
        };

        // id_venta lo asignará procesarBatch tras el bulkCreate con returning
        const detalleData = {
            id_item: item?.id_item,
            cantidad_emp: this.normalizarValor(fila['Cantidad emp.']),
            cantidad: this.normalizarValor(fila['Cantidad']),
            precio_unitario: this.normalizarValor(fila['Costo promedio total']),
            costo_promedio_total: this.normalizarValor(fila['Costo promedio total']),
            descuento: this.normalizarValor(fila['Valor descuentos']),
            subtotal: this.normalizarValor(fila['Valor subtotal']),
            reporte_prov_con_obs: fila['REPORTE PROV CON OBS']?.trim() || null
        };

        // Si es NC (Nota de Crédito), asegurarse de que los valores negativos se mantengan
        // Puedes identificar NC por el tipo de documento o por el valor negativo en subtotal
        // Aquí se asume que si subtotal es negativo, es NC
        if (detalleData.subtotal < 0) {
            // Asegurar que cantidad, valor, subtotal, etc. sean negativos si corresponde
            if (detalleData.cantidad && detalleData.cantidad > 0) detalleData.cantidad = -Math.abs(detalleData.cantidad);
            if (detalleData.cantidad_emp && detalleData.cantidad_emp > 0) detalleData.cantidad_emp = -Math.abs(detalleData.cantidad_emp);
            if (detalleData.precio_unitario && detalleData.precio_unitario > 0) detalleData.precio_unitario = -Math.abs(detalleData.precio_unitario);
            if (detalleData.costo_promedio_total && detalleData.costo_promedio_total > 0) detalleData.costo_promedio_total = -Math.abs(detalleData.costo_promedio_total);
            if (detalleData.descuento && detalleData.descuento > 0) detalleData.descuento = -Math.abs(detalleData.descuento);
        }
        return { ventaData, detalleData };
    }

    async procesarBatch(filas, encabezados) {
        const ventasData = [];
        const detallesData = [];

        try {
            // 1) BUCLE DE PREPARACIÓN: Recorre el batch y prepara datos
            for (const linea of filas) {
                if (!linea || linea.trim() === '') continue;

                this.estadisticas.totalLineas++;
                let fila;
                try {
                    fila = this.parsearLinea(linea, encabezados);
                } catch (err) {
                    this.estadisticas.errores++;
                    if (this.verbose) {
                        console.error(`❌ Error parseando fila ${this.estadisticas.totalLineas}:`, err.message);
                    }
                    this.estadisticas.erroresDetallados.push({
                        fila: this.estadisticas.totalLineas,
                        error: err.message
                    });
                    continue;
                }

                try {
                    const resultado = await this.prepararDatosFila(fila, null);
                    ventasData.push(resultado.ventaData);
                    detallesData.push(resultado.detalleData);
                } catch (err) {
                    this.estadisticas.errores++;
                    if (this.verbose) {
                        console.error(`❌ Error preparando fila ${this.estadisticas.totalLineas}:`, err.message);
                    }
                    this.estadisticas.erroresDetallados.push({
                        fila: this.estadisticas.totalLineas,
                        error: err.message
                    });
                    continue;
                }

                if (this.estadisticas.totalLineas % this.BULK_DISPLAY_INTERVAL === 0) {
                    console.log(`📊 ${this.estadisticas.totalLineas} filas procesadas | 🧩 ${ventasData.length} preparadas | ✅ ${this.estadisticas.exitosas} exitosas | ❌ ${this.estadisticas.errores} errores`);
                }
            }

            if (ventasData.length === 0) {
                console.log('⚠️ Lote sin filas válidas para insertar');
                return;
            }

            // 2) AGRUPAR CABECERAS ÚNICAS: Extrae cabeceras usando numero_documento como clave
            const mapaVentasUnicas = new Map();
            const ventasUnicas = [];
            for (const ventaData of ventasData) {
                const clave = ventaData.numero_documento || `FACTURA_${Date.now()}_${Math.random()}`;
                if (!mapaVentasUnicas.has(clave)) {
                    mapaVentasUnicas.set(clave, ventaData);
                    ventasUnicas.push(ventaData);
                }
            }

            console.log(`   📋 ${ventasUnicas.length} cabeceras únicas de ${ventasData.length} detalles preparados`);

            const transaccion = await this.sequelize.transaction();

            try {
                // 3) INSERCIÓN DE CABECERAS (UPSERT): bulkCreate con updateOnDuplicate
                const ventasCreadas = await this.venta.bulkCreate(ventasUnicas, {
                    transaction: transaccion,
                    returning: true,
                    updateOnDuplicate: [
                        'fecha', 'id_cliente', 'id_vendedor', 'id_canal', 'id_subcanal',
                        'id_tipo_documento', 'precio_unitario_con_impuesto', 'valor_descuentos',
                        'valor_impuestos', 'valor_neto', 'subtotal', 'margen_promedio',
                        'impuesto_afecta_margen', 'condicion_pago', 'porcentaje_descuento', 'porcentaje_impuesto'
                    ]
                });

                console.log(`   ✅ ${ventasCreadas.length} cabeceras procesadas (nuevas o actualizadas)`);

                // 4) DICCIONARIO DE IDs: Consulta BD para obtener id_venta de los numero_documento
                const numerosDocumento = [...mapaVentasUnicas.keys()].filter(k => k !== null && !k.startsWith('FACTURA_'));
                const mapaVentas = new Map();

                if (numerosDocumento.length > 0) {
                    const ventasEnBD = await this.venta.findAll({
                        where: { numero_documento: numerosDocumento },
                        attributes: ['id_venta', 'numero_documento'],
                        raw: true,
                        transaction: transaccion
                    });

                    ventasEnBD.forEach(v => {
                        mapaVentas.set(v.numero_documento, v.id_venta);
                    });
                }

                // Asignar también los IDs de las ventas recién creadas
                ventasCreadas.forEach(v => {
                    mapaVentas.set(v.numero_documento, v.id_venta);
                });

                // 5) ASIGNAR IDs A DETALLES: Recorre TODOS los detalles sin descartar ninguno
                const detallesConId = [];
                for (let i = 0; i < ventasData.length; i++) {
                    const ventaData = ventasData[i];
                    const detalleData = detallesData[i];
                    const clave = ventaData.numero_documento || `FACTURA_${Date.now()}_${Math.random()}`;
                    const id_venta = mapaVentas.get(clave);

                    if (!id_venta) {
                        this.estadisticas.errores++;
                        console.warn(`⚠️ No se encontró id_venta para ${clave}, fila omitida`);
                        this.estadisticas.erroresDetallados.push({
                            fila: i + 1,
                            error: `No se encontró id_venta para numero_documento: ${clave}`
                        });
                        continue;
                    }

                    detallesConId.push({
                        ...detalleData,
                        id_venta: id_venta
                    });
                }

                if (detallesConId.length === 0) {
                    console.log('⚠️ No hay detalles con id_venta válido para insertar');
                    await transaccion.commit();
                    return;
                }

                console.log(`   📦 ${detallesConId.length} detalles preparados con id_venta asignado`);

                // 6) INSERCIÓN MASIVA DE DETALLES: bulkCreate de todos los detalles
                let detallesProcesados = 0;
                while (detallesProcesados < detallesConId.length) {
                    const batchDetalles = detallesConId.slice(
                        detallesProcesados,
                        detallesProcesados + this.BATCH_UPSERT_DETALLE_SIZE
                    );

                    await this.detalle_venta.bulkCreate(batchDetalles, {
                        transaction: transaccion,
                        returning: false,
                        updateOnDuplicate: [
                            'cantidad_emp', 'cantidad', 'precio_unitario', 'costo_promedio_total',
                            'descuento', 'subtotal'
                        ]
                    });

                    detallesProcesados += batchDetalles.length;
                    console.log(`      ↪️ Detalles insertados: ${detallesProcesados}/${detallesConId.length}`);
                }

                await transaccion.commit();

                // 7) MANTENER ESTADÍSTICAS: Sumar cantidad de detalles insertados
                this.estadisticas.exitosas += detallesConId.length;
                this.estadisticas.nuevasVentas += ventasCreadas.length;

                console.log(`   ✅ Lote confirmado: ${ventasCreadas.length} cabeceras | ${detallesConId.length} detalles | Total acumulado: ${this.estadisticas.totalLineas}`);

            } catch (error) {
                await transaccion.rollback();
                throw error;
            }

        } catch (error) {
            throw error;
        }
    }

    async importar(rutaArchivo) {
        this.estadisticas.tiempoInicio = Date.now();
        let hashArchivo = null;
        try {
            console.log(`\n🚀 INICIANDO IMPORT OPTIMIZADO: ${path.basename(rutaArchivo)}`);
            const extension = this.validarArchivoPlano(rutaArchivo);
            hashArchivo = await this.validarArchivoNoDuplicado(rutaArchivo);
            await this.precargaDatos();
            if (extension === '.csv') {
                // Leer el archivo como buffer para detectar y convertir encoding
                let contenido = fs.readFileSync(rutaArchivo);
                // Detectar si es UTF-8 o ISO-8859-1 (Latin-1)
                // Por simplicidad, intentamos decodificar como UTF-8 y si hay caracteres inválidos, usamos Latin-1
                let texto;
                try {
                    texto = contenido.toString('utf8');
                    // Si contiene caracteres de reemplazo, probablemente no es UTF-8
                    if (texto.includes('�')) {
                        texto = iconv.decode(contenido, 'latin1');
                    }
                } catch (e) {
                    texto = iconv.decode(contenido, 'latin1');
                }
                const registros = parse(texto, { columns: true, skip_empty_lines: true });
                const encabezados = Object.keys(registros[0] || {});
                this.validarEncabezados(encabezados);
                // Procesar en batches
                let batch = [];
                for (const fila of registros) {
                    batch.push(fila);
                    if (batch.length >= this.BATCH_INSERT_SIZE) {
                        await this.procesarBatchCSV(batch, encabezados);
                        batch = [];
                    }
                }
                if (batch.length > 0) {
                    await this.procesarBatchCSV(batch, encabezados);
                }
            } else {
                // TXT o TSV: igual que antes
                const fileStream = fs.createReadStream(rutaArchivo, { encoding: 'utf8' });
                let delimitador = '\t';
                if (extension === '.tsv') delimitador = '\t';
                const rl = readline.createInterface({
                    input: fileStream,
                    crlfDelay: Infinity
                });
                let encabezados = [];
                let batch = [];
                let esEncabezado = true;
                for await (const linea of rl) {
                    if (!linea || linea.trim() === '') continue;
                    if (esEncabezado) {
                        encabezados = linea.split(delimitador).map(h => h.trim());
                        this.validarEncabezados(encabezados);
                        esEncabezado = false;
                        console.log(`✅ Encabezados detectados: ${encabezados.length} columnas\n`);
                        continue;
                    }
                    batch.push(linea);
                    if (batch.length >= this.BATCH_INSERT_SIZE) {
                        await this.procesarBatch(batch, encabezados, delimitador);
                        batch = [];
                    }
                }
                if (batch.length > 0) {
                    await this.procesarBatch(batch, encabezados, delimitador);
                }
            }
            this.estadisticas.tiempoFin = Date.now();
            return this.estadisticas;
        } catch (error) {
            if (hashArchivo) {
                this.archivosEnProceso.delete(hashArchivo);
            }
            console.error("\n❌ Error crítico en importación:", error);
            throw error;
        }
    }
    // Procesa un batch de objetos (no líneas) para CSV
    async procesarBatchCSV(filas, encabezados) {
        // Convierte cada fila (objeto) a formato esperado por prepararDatosFila
        for (let i = 0; i < filas.length; i++) {
            filas[i] = this.normalizarFilaCSV(filas[i], encabezados);
        }
        await this.procesarBatch(filas, encabezados, ',');
    }

    // Normaliza los valores de una fila CSV (quita comillas, espacios, etc.)
    normalizarFilaCSV(fila, encabezados) {
        const obj = {};
        for (const key of encabezados) {
            obj[key] = typeof fila[key] === 'string' ? fila[key].trim() : fila[key];
        }
        return obj;
    }

}

// Exporta la clase correctamente para uso con require()
module.exports = ImportadorVentasOptimizado;