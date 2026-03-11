const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Op } = require('sequelize');

class ImportadorVentas {
    constructor(sequelize, models) {
        this.sequelize = sequelize;
        
        // Acceder correctamente a los modelos
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
        
        // 🚀 OPTIMIZACIÓN 1: Inicializar el Caché en Memoria
        this.cache = new Map();
        
        // Aumentamos el tamaño del batch porque ahora es mucho más rápido
        this.batchSize = 500; 
        this.verbose = false;
        
        this.estadisticas = {
            totalLineas: 0,
            exitosas: 0,
            errores: 0,
            erroresDetallados: [],
            tiempoInicio: null,
            tiempoFin: null
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

    // 🆕 Separar código y nombre (ej: "625 - BELLEZA EXPRESS" → código: "625", nombre: "BELLEZA EXPRESS")
    separarCodigoNombre(texto) {
        if (!texto) return { codigo: null, nombre: null };
        const partes = texto.split('-').map(p => p.trim());
        if (partes.length >= 2) {
            return {
                codigo: partes[0],
                nombre: partes.slice(1).join('-')
            };
        }
        return { codigo: null, nombre: texto };
    }

    // 🆕 Separar tipo documento (ej: "FE1-00391434" → nombre: "FE1", consecutivo: 391434)
    separarTipoDocumento(nroDocumento) {
        if (!nroDocumento || nroDocumento.trim() === '') return { nombre: null, consecutivo: null };
        const partes = nroDocumento.trim().split('-');
        if (partes.length === 2) {
            return {
                nombre: partes[0].trim(),
                consecutivo: parseInt(partes[1], 10) || null
            };
        }
        return { nombre: nroDocumento.trim(), consecutivo: null };
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

    parsearLinea(linea, encabezados) {
        const valores = linea.split('\t');
        const registro = {};
        encabezados.forEach((encabezado, index) => {
            registro[encabezado.trim()] = valores[index] ? valores[index].trim() : '';
        });
        return registro;
    }

    // 🚀 OPTIMIZACIÓN 2: Obtener o Crear usando RAM en lugar de la BD cada vez
    async obtenerOCrearConCache(modelo, prefijo, filtro, datos) {
        try {
            // Generar una clave única usando el prefijo y los datos (ej: PROV_{"nombre":"Nestle"})
            const claveCache = `${prefijo}_${JSON.stringify(datos)}`;

            // 1. Buscar en la memoria RAM (¡Toma milisegundos!)
            if (this.cache.has(claveCache)) {
                return this.cache.get(claveCache);
            }

            // 2. Si no está en RAM, ir a la Base de Datos
            let registro = await modelo.findOne({ 
                where: filtro,
                raw: true 
            });

            // 3. Si no existe en la BD, crearlo
            if (!registro) {
                registro = await modelo.create(datos);
                if (registro.get) {
                    registro = registro.get({ plain: true }); // Convertir a objeto plano
                }
            }

            // 4. Guardarlo en la RAM para la próxima vez
            this.cache.set(claveCache, registro);
            return registro;

        } catch (error) {
            console.error(`❌ Error en Caché - Modelo: ${modelo.name || 'Desconocido'}, Error:`, error.message);
            throw error; 
        }
    }

    async procesarFila(fila) {
        try {
            if (!fila || Object.keys(fila).length === 0) throw new Error('Fila vacía');

            // 1. NIVEL 1 - Separar PROVEEDOR en código y nombre desde LINEA
            const proveedorData = this.separarCodigoNombre(fila['LINEA']?.trim());
            const proveedor = await this.obtenerOCrearConCache(this.proveedor, 'PROV',
                { codigo: proveedorData.codigo },
                { codigo: proveedorData.codigo, nombre: proveedorData.nombre }
            );
            
            const megacategoria = await this.obtenerOCrearConCache(this.megacategoria, 'MEGA',
                { nombre: { [Op.iLike]: fila['MEGACATEGORIA']?.trim() } },
                { nombre: fila['MEGACATEGORIA']?.trim() }
            );

            const canal = await this.obtenerOCrearConCache(this.canal, 'CANAL',
                { nombre: { [Op.iLike]: fila['CANAL']?.trim() } },
                { nombre: fila['CANAL']?.trim() }
            );

            const ciudad = await this.obtenerOCrearConCache(this.ciudad, 'CIUDAD',
                { nombre: { [Op.iLike]: fila['Desc. ciudad']?.trim() } },
                { nombre: fila['Desc. ciudad']?.trim() }
            );

            const tipoNegocio = await this.obtenerOCrearConCache(this.tipo_negocio, 'TNEG',
                { tipo_negocio: { [Op.iLike]: fila['TIPO DE NEGOCIO']?.trim() } },
                { 
                    tipo_negocio: fila['TIPO DE NEGOCIO']?.trim(),
                    detalle_tipo_negocio: fila['DETALLE TIPO DE NEGOCIO']?.trim()
                }
            );

            // 2. NIVEL 2
            const categoria = await this.obtenerOCrearConCache(this.categoria, 'CAT',
                { nombre: { [Op.iLike]: fila['CATEGORIA']?.trim() }, id_megacategoria: megacategoria.id_megacategoria },
                { nombre: fila['CATEGORIA']?.trim(), id_megacategoria: megacategoria.id_megacategoria }
            );

            const subcanal = await this.obtenerOCrearConCache(this.subcanal, 'SUBCANAL',
                { nombre: { [Op.iLike]: fila['SUBCANAL']?.trim() }, id_canal: canal.id_canal },
                { nombre: fila['SUBCANAL']?.trim(), id_canal: canal.id_canal }
            );

            const barrio = await this.obtenerOCrearConCache(this.barrio, 'BARRIO',
                { nombre: { [Op.iLike]: fila['Barrio']?.trim() }, id_ciudad: ciudad.id_ciudad },
                { nombre: fila['Barrio']?.trim(), id_ciudad: ciudad.id_ciudad }
            );

            // 3. NIVEL 3
            const subcategoria = await this.obtenerOCrearConCache(this.subcategoria, 'SUBCAT',
                { nombre: { [Op.iLike]: fila['SUBCATEGORIA']?.trim() }, id_categoria: categoria.id_categoria },
                { nombre: fila['SUBCATEGORIA']?.trim(), id_categoria: categoria.id_categoria }
            );

            const cliente = await this.obtenerOCrearConCache(this.cliente, 'CLI',
                { nro_documento: { [Op.iLike]: fila['Cliente factura']?.trim() } },
                { 
                    nro_documento: fila['Cliente factura']?.trim(),
                    razon_social: fila['Razon social cliente factura']?.trim(),
                    sucursal: fila['Sucursal factura']?.trim(),
                    nombre_establecimiento: fila['Razon social cliente factura']?.trim(),
                    direccion: fila['Direccion 1']?.trim(),
                    id_ciudad: ciudad.id_ciudad,
                    id_barrio: barrio.id_barrio,
                    id_canal: canal.id_canal,
                    id_tipo_negocio: tipoNegocio.id_tipo_negocio
                }
            );

            // 🔧 CORREGIDO: Vendedor solo con codigo_vendedor y nombre
            const vendedor = await this.obtenerOCrearConCache(this.vendedor, 'VEND',
                { codigo_vendedor: { [Op.iLike]: fila['Codigo vendedor']?.trim() } },
                { codigo_vendedor: fila['Codigo vendedor']?.trim(), nombre: fila['Nombre vendedor']?.trim() }
            );

            // 4. NIVEL 4 - OBSEQUIO
            let obsequio = null;
            if (fila['REPORTE PROV CON OBS']?.trim()) {
                obsequio = await this.obtenerOCrearConCache(this.obsequio, 'OBS',
                    { descripcion: { [Op.iLike]: fila['REPORTE PROV CON OBS']?.trim() } },
                    { 
                        descripcion: fila['REPORTE PROV CON OBS']?.trim(), 
                        valor_obsequio: this.normalizarValor(fila['Valor subtotal']) 
                    }
                );
            }

            // 🔧 CORREGIDO: Item con cantidad_empaque
            const item = await this.obtenerOCrearConCache(this.item, 'ITEM',
                { codigo_item: { [Op.iLike]: fila['Item']?.trim() } },
                { 
                    codigo_item: fila['Item']?.trim(),
                    descripcion: fila['Desc. item']?.trim(),
                    unidad_medida_orden: fila['U.M. Orden']?.trim(),
                    cantidad_empaque: this.normalizarValor(fila['Cantidad emp.']) || 0,
                    factor_um_empaque: this.normalizarValor(fila['Factor U.M. emp.']) || 1,
                    factor_um_orden: this.normalizarValor(fila['Factor U.M. Orden']) || 1,
                    peso_kilo: this.normalizarValor(fila['Peso en KILO']) || 0,
                    id_categoria: categoria.id_categoria,
                    id_subcategoria: subcategoria.id_subcategoria,
                    id_megacategoria: megacategoria.id_megacategoria,
                    id_proveedor: proveedor.id_proveedor,
                    id_obsequio: obsequio ? obsequio.id_obsequio : null
                }
            );

            // 🔧 NUEVO: Separar TIPO_DOCUMENTO de Nro documento
            const tipoDocData = this.separarTipoDocumento(fila['Nro documento']?.trim());
            const tipoDocumento = await this.obtenerOCrearConCache(this.tipo_documento, 'TDOC',
                { nombre: tipoDocData.nombre },
                { nombre: tipoDocData.nombre, consecutivo: tipoDocData.consecutivo }
            );

            // 5. NIVEL 5 - VENTA (con id_tipo_documento y campos corregidos)
            const venta = await this.venta.create({
                numero_documento: fila['Nro documento']?.trim(),
                fecha: this.parsearFecha(fila['Fecha']),
                id_cliente: cliente.id_cliente,
                id_vendedor: vendedor.id_vendedor,
                id_canal: canal.id_canal,
                id_subcanal: subcanal.id_subcanal,
                id_tipo_documento: tipoDocumento.id_tipo_documento,
                precio_unitario_con_impuesto: this.normalizarValor(fila['Valor impuestos']),
                porcentaje_descuentos: null,
                porcentaje_impuesto: null,
                valor_descuentos: this.normalizarValor(fila['Valor descuentos']),
                valor_impuestos: this.normalizarValor(fila['Valor impuestos']),
                valor_neto: this.normalizarValor(fila['Valor neto']),
                subtotal: this.normalizarValor(fila['Valor subtotal']),
                margen_promedio: this.normalizarValor(fila['Margen promedio']) || 0,
                impuesto_afecta_margen: this.normalizarValor(fila['Impuesto afecta margen']),
                condicion_pago: fila['Cond. pago fact']?.trim().substring(0, 20)
            });

            // 6. NIVEL 6 - DETALLE_VENTA
            const detalleVenta = await this.detalle_venta.create({
                id_venta: venta.id_venta,
                id_item: item.id_item,
                cantidad_emp: this.normalizarValor(fila['Cantidad emp.']) || 0,
                cantidad: this.normalizarValor(fila['Cantidad']) || 0,
                precio_unitario: this.normalizarValor(fila['Costo promedio total']),
                costo_promedio_total: this.normalizarValor(fila['Costo promedio total']),
                descuento: this.normalizarValor(fila['Valor descuentos']),
                subtotal: this.normalizarValor(fila['Valor subtotal'])
            });

            return true;

        } catch (error) {
            this.estadisticas.errores++;
            if (this.verbose) {
                console.error(`❌ Error en fila ${this.estadisticas.totalLineas}:`, error.message);
                this.estadisticas.erroresDetallados.push({
                    numFila: this.estadisticas.totalLineas,
                    error: error.message
                });
            }
            return false;
        }
    }

    async procesarBatch(filas, encabezados) {
        // En lugar de procesarlos en serie uno tras otro, 
        // Sequelize los gestionará más rápido con el caché mitigando la carga.
        for (const linea of filas) {
            this.estadisticas.totalLineas++;
            const fila = this.parsearLinea(linea, encabezados);
            const exito = await this.procesarFila(fila);
            if (exito) this.estadisticas.exitosas++;
        }
    }

    async importar(rutaArchivo) {
        this.estadisticas.tiempoInicio = Date.now();
        
        try {
            const fileStream = fs.createReadStream(rutaArchivo, { encoding: 'utf8' });
            
            // 🚀 OPTIMIZACIÓN 3: Uso de for await...of para lectura de archivos (Natividad Moderna)
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let encabezados = [];
            let batch = [];
            let esEncabezado = true;

            for await (const linea of rl) {
                if (!linea || linea.trim() === '') continue; // Evitar líneas vacías

                if (esEncabezado) {
                    encabezados = linea.split('\t').map(h => h.trim());
                    esEncabezado = false;
                    console.log(`✅ Encabezados detectados: ${encabezados.length} columnas`);
                    continue;
                }

                batch.push(linea);

                if (batch.length >= this.batchSize) {
                    await this.procesarBatch(batch, encabezados);
                    console.log(`📊 Procesadas ${this.estadisticas.totalLineas} filas... (${this.estadisticas.exitosas} exitosas, ${this.estadisticas.errores} errores)`);
                    batch = []; // Limpiar lote
                }
            }

            // Procesar el último lote remanente
            if (batch.length > 0) {
                await this.procesarBatch(batch, encabezados);
            }

            this.estadisticas.tiempoFin = Date.now();
            this.mostrarResumen();
            return this.estadisticas;

        } catch (error) {
            console.error("Error crítico durante la importación:", error);
            throw error;
        }
    }

    mostrarResumen() {
        const tiempoTotal = ((this.estadisticas.tiempoFin - this.estadisticas.tiempoInicio) / 1000).toFixed(2);
        const velocidad = (this.estadisticas.exitosas / (tiempoTotal || 1)).toFixed(2);

        console.log(`
╔════════════════════════════════════════╗
║        RESUMEN DE IMPORTACIÓN          ║
╚════════════════════════════════════════╝
✅ Exitosas: ${this.estadisticas.exitosas}
❌ Errores: ${this.estadisticas.errores}
⏱️  Tiempo total: ${tiempoTotal}s
⚡ Velocidad: ${velocidad} registros/segundo
        `);
    }
}

module.exports = ImportadorVentas;