const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Op } = require('sequelize');

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

        this.BATCH_INSERT_SIZE = 15000;
        this.TRANSACTION_SIZE = 5000;
        this.BULK_DISPLAY_INTERVAL = 10000;

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
        if (!valor) return null;
        valor = valor.trim();
        if (valor === '$0,00' || valor === '0' || valor === '0,00') return 0;
        if (valor.includes('$')) valor = valor.substring(1);
        valor = valor.replace(/\./g, '').replace(',', '.');
        const numero = parseFloat(valor);
        return isNaN(numero) ? null : numero;
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

    parsearLinea(linea, encabezados) {
        const valores = linea.split('\t');
        const registro = {};
        encabezados.forEach((encabezado, index) => {
            registro[encabezado.trim()] = valores[index] ? valores[index].trim() : '';
        });
        return registro;
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

    async obtenerOCrearOptimizado(modelo, cacheKey, clave, datosCompletos) {
        const claveNormalizada = clave?.toLowerCase();

        if (this.maestros[cacheKey]?.has(claveNormalizada)) {
            return this.maestros[cacheKey].get(claveNormalizada);
        }

        if (this.nuevosCreados[cacheKey]?.has(claveNormalizada)) {
            return this.nuevosCreados[cacheKey].get(claveNormalizada);
        }

        const nuevoRegistro = await modelo.create(datosCompletos);
        const objeto = nuevoRegistro.get({ plain: true });

        this.nuevosCreados[cacheKey].set(claveNormalizada, objeto);
        return objeto;
    }

    async procesarFila(fila, transaccion = null) {
        try {
            if (!fila || Object.keys(fila).length === 0) throw new Error('Fila vacía');

            const { codigo: codProveedor, nombre: nomProveedor } = this.separarCodigoNombre(fila['LINEA']);
            const { nombre: nomTipoDoc, consecutivo: nroDocumento } = this.separarTipoDocumento(fila['Nro documento']);

            const proveedor = await this.obtenerOCrearOptimizado(
                this.proveedor, 'proveedores',
                nomProveedor,
                { codigo: codProveedor, nombre: nomProveedor }
            );

            const megacategoria = await this.obtenerOCrearOptimizado(
                this.megacategoria, 'megacategorias',
                fila['MEGACATEGORIA'],
                { nombre: fila['MEGACATEGORIA']?.trim() }
            );

            const categoria = await this.obtenerOCrearOptimizado(
                this.categoria, 'categorias',
                `${fila['CATEGORIA']}_${megacategoria?.id_megacategoria}`,
                { nombre: fila['CATEGORIA']?.trim(), id_megacategoria: megacategoria?.id_megacategoria }
            );

            const subcategoria = await this.obtenerOCrearOptimizado(
                this.subcategoria, 'subcategorias',
                `${fila['SUBCATEGORIA']}_${categoria?.id_categoria}`,
                { nombre: fila['SUBCATEGORIA']?.trim(), id_categoria: categoria?.id_categoria }
            );

            const canal = await this.obtenerOCrearOptimizado(
                this.canal, 'canales',
                fila['CANAL'],
                { nombre: fila['CANAL']?.trim() }
            );

            const subcanal = await this.obtenerOCrearOptimizado(
                this.subcanal, 'subcanales',
                `${fila['SUBCANAL']}_${canal?.id_canal}`,
                { nombre: fila['SUBCANAL']?.trim(), id_canal: canal?.id_canal }
            );

            const ciudad = await this.obtenerOCrearOptimizado(
                this.ciudad, 'ciudades',
                fila['Desc. ciudad'],
                { nombre: fila['Desc. ciudad']?.trim() }
            );

            const barrio = await this.obtenerOCrearOptimizado(
                this.barrio, 'barrios',
                `${fila['Barrio']}_${ciudad?.id_ciudad}`,
                { nombre: fila['Barrio']?.trim(), id_ciudad: ciudad?.id_ciudad }
            );

            const tipoNegocio = await this.obtenerOCrearOptimizado(
                this.tipo_negocio, 'tiposNegocio',
                fila['TIPO DE NEGOCIO'],
                {
                    tipo_negocio: fila['TIPO DE NEGOCIO']?.trim(),
                    detalle_tipo_negocio: fila['DETALLE TIPO DE NEGOCIO']?.trim() || ''
                }
            );

            const tipoDocumento = fila["Nro documento"] ?
                await this.obtenerOCrearOptimizado(
                    this.tipo_documento, 'tiposDocumento',
                    `${fila["Nro documento"]}_${this.estadisticas.totalLineas}`,
                    { nombre: nomTipoDoc, consecutivo: nroDocumento }
                ) : null;

            const vendedor = await this.obtenerOCrearOptimizado(
                this.vendedor, 'vendedores',
                fila['Codigo vendedor'],
                {
                    codigo_vendedor: fila['Codigo vendedor']?.trim(),
                    nombre: fila['Nombre vendedor']?.trim() || 'SIN NOMBRE'
                }
            );

            const cliente = await this.cliente.create({
                nro_documento: fila['Cliente factura']?.trim(),
                razon_social: fila['Razon social cliente factura']?.trim() || '',
                sucursal: fila['Sucursal factura']?.trim() || '',
                direccion: fila['Direccion 1']?.trim() || '',
                nombre_establecimiento: fila['Razon social cliente factura']?.trim() || '',
                id_ciudad: ciudad?.id_ciudad,
                id_barrio: barrio?.id_barrio
            }, { transaction: transaccion });

            const item = await this.item.create({
                codigo_item: fila['Item']?.trim(),
                descripcion: fila['Desc. item']?.trim() || '',
                id_proveedor: proveedor?.id_proveedor,
                id_megacategoria: megacategoria?.id_megacategoria,
                id_categoria: categoria?.id_categoria,
                id_subcategoria: subcategoria?.id_subcategoria,
                cantidad_empaque: this.normalizarValor(fila['Cantidad emp.']) || 0,
                unidad_medida_empaque: this.normalizarValor(fila['Factor U.M. emp.']) || 0,
                unidad_medida_orden: this.normalizarValor(fila['Factor U.M. Orden']) || 0,
                peso_kilo: this.normalizarValor(fila['Peso en KILO']) || 0
            }, { transaction: transaccion });

            const venta = await this.venta.create({
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
                porcentaje_descuentos: null,
                porcentaje_impuesto: null
            }, { transaction: transaccion });

            if (fila['REPORTE PROV CON OBS'] && fila['REPORTE PROV CON OBS'].trim()) {
                await this.obsequio.create({
                    descripcion: fila['REPORTE PROV CON OBS']?.trim(),
                    valor_obsequio: this.normalizarValor(fila['Valor subtotal']) || 0
                }, { transaction: transaccion });
            }

            const detalleVenta = await this.detalle_venta.create({
                id_venta: venta?.id_venta,
                id_item: item?.id_item,
                cantidad_emp: this.normalizarValor(fila['Cantidad emp.']) || 0,
                cantidad: this.normalizarValor(fila['Cantidad']) || 0,
                precio_unitario: this.normalizarValor(fila['Costo promedio total']),
                costo_promedio_total: this.normalizarValor(fila['Costo promedio total']),
                descuento: this.normalizarValor(fila['Valor descuentos']),
                subtotal: this.normalizarValor(fila['Valor subtotal'])
            }, { transaction: transaccion });

            this.estadisticas.nuevasVentas++;
            return true;

        } catch (error) {
            this.estadisticas.errores++;
            if (this.verbose) {
                console.error(`❌ Error en fila ${this.estadisticas.totalLineas}:`, error.message);
            }
            return false;
        }
    }

    async procesarBatch(filas, encabezados) {
        let ventasEnTransaccion = 0;
        let transaccion = await this.sequelize.transaction();

        try {
            for (const linea of filas) {
                if (!linea || linea.trim() === '') continue;

                this.estadisticas.totalLineas++;
                const fila = this.parsearLinea(linea, encabezados);

                const exito = await this.procesarFila(fila, transaccion);
                if (exito) {
                    this.estadisticas.exitosas++;
                    ventasEnTransaccion++;

                    if (ventasEnTransaccion >= this.TRANSACTION_SIZE) {
                        await transaccion.commit();
                        console.log(`   ✅ Transacción confirmada: ${this.estadisticas.totalLineas} filas`);

                        transaccion = await this.sequelize.transaction();
                        ventasEnTransaccion = 0;
                    }

                    if (this.estadisticas.totalLineas % this.BULK_DISPLAY_INTERVAL === 0) {
                        console.log(`📊 ${this.estadisticas.totalLineas} filas procesadas...`);
                    }
                }
            }

            if (ventasEnTransaccion > 0) {
                await transaccion.commit();
                console.log(`   ✅ Transacción final confirmada: ${ventasEnTransaccion} filas`);
            }

        } catch (error) {
            await transaccion.rollback();
            throw error;
        }
    }

    async importar(rutaArchivo) {
        this.estadisticas.tiempoInicio = Date.now();

        try {
            console.log(`\n🚀 INICIANDO IMPORT OPTIMIZADO: ${path.basename(rutaArchivo)}`);

            await this.precargaDatos();

            const fileStream = fs.createReadStream(rutaArchivo, { encoding: 'utf8' });

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
                    encabezados = linea.split('\t').map(h => h.trim());
                    esEncabezado = false;
                    console.log(`✅ Encabezados detectados: ${encabezados.length} columnas\n`);
                    continue;
                }

                batch.push(linea);

                if (batch.length >= this.BATCH_INSERT_SIZE) {
                    await this.procesarBatch(batch, encabezados);
                    batch = [];
                }
            }

            if (batch.length > 0) {
                await this.procesarBatch(batch, encabezados);
            }

            this.estadisticas.tiempoFin = Date.now();
            this.mostrarResumen();
            return this.estadisticas;

        } catch (error) {
            console.error("\n❌ Error crítico en importación:", error);
            throw error;
        }
    }

    mostrarResumen() {
        const tiempoTotal = (this.estadisticas.tiempoFin - this.estadisticas.tiempoInicio) / 1000;
        const velocidad = (this.estadisticas.exitosas / tiempoTotal).toFixed(2);

        console.log(`
╔════════════════════════════════════════════════════════╗
║           ✅ IMPORTACIÓN COMPLETADA                    ║
╚════════════════════════════════════════════════════════╝

📊 RESULTADOS:
   ✅ Exitosas: ${this.estadisticas.exitosas}
   ❌ Errores: ${this.estadisticas.errores}
   ⏱️  Tiempo total: ${tiempoTotal.toFixed(2)}s
   ⚡ Velocidad: ${velocidad} registros/segundo

🆕 NUEVOS CREADOS:
   • Proveedores: ${this.estadisticas.nuevosProveedores}
   • Megacategorías: ${this.estadisticas.nuevasMegacategorias}
   • Ventas: ${this.estadisticas.nuevasVentas}

📦 PRECARGAS INICIALES:
   • Proveedores: ${this.estadisticas.maestrosPreCargados.proveedores}
   • Megacategorías: ${this.estadisticas.maestrosPreCargados.megacategorias}
   • Categorías: ${this.estadisticas.maestrosPreCargados.categorias}
   • Canales: ${this.estadisticas.maestrosPreCargados.canales}
   • Ciudades: ${this.estadisticas.maestrosPreCargados.ciudades}
   • Clientes: ${this.estadisticas.maestrosPreCargados.clientes}
   • Items: ${this.estadisticas.maestrosPreCargados.items}

        `);
    }
}

module.exports = ImportadorVentasOptimizado;
