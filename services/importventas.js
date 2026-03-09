const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Op, fn, col } = require('sequelize');

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
        this.cliente = models.cliente_model;
        this.item = models.item_model;
        this.obsequio = models.obsequio_model;
        this.venta = models.venta_model;
        this.detalle_venta = models.detalle_venta_model;

        this.batchSize = 100;
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

        if (valor === '$0,00' || valor === '0' || valor === '0,00') {
            return 0;
        }

        // Remover símbolo de moneda y espacios
        if (valor.includes('$')) {
            valor = valor.substring(1);
        }

        // Convertir formato de moneda colombiana a número
        valor = valor.replace(/\./g, '').replace(',', '.');

        const numero = parseFloat(valor);
        return isNaN(numero) ? null : numero;
    }

    parsearFecha(valor) {
        if (!valor || valor.trim() === '') return null;

        valor = valor.trim();

        // Intentar parsear formato DD/MM/YYYY
        const partes = valor.split('/');
        if (partes.length === 3) {
            const dia = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10);
            const anio = parseInt(partes[2], 10);

            // Validar que sea una fecha válida
            const fecha = new Date(anio, mes - 1, dia);
            if (fecha.getDate() === dia && fecha.getMonth() === mes - 1 && fecha.getFullYear() === anio) {
                // Convertir a ISO format (YYYY-MM-DD)
                const isoFecha = fecha.toISOString().split('T')[0];
                return isoFecha;
            }
        }

        // Si falla, intentar parsear como ISO (YYYY-MM-DD)
        if (valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return valor;
        }

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

    async obtenerOCrearRegistro(modelo, filtro, datos) {
        try {
            // Buscar registro existente
            let registro = await modelo.findOne({
                where: filtro,
                raw: true
            });

            // Si existe, retornarlo
            if (registro) {
                return registro;
            }

            // Si no existe, crear uno nuevo
            registro = await modelo.create(datos);
            return registro;

        } catch (error) {
            console.error(`❌ Error en obtenerOCrearRegistro - Modelo: ${modelo.name || 'Desconocido'}, Error:`, error.message);
            console.error(`   Filtro:`, filtro);
            console.error(`   Datos:`, datos);
            throw error; // Lanzar el error en lugar de devolverlo silenciosamente
        }
    }

    async buscarRegistro(modelo, campo, valor) {
        try {
            if (!valor || valor.trim() === '') {
                return null;
            }

            const registro = await modelo.findOne({
                where: {
                    [campo]: valor.trim()
                }
            });

            return registro;
        } catch (error) {
            return null;
        }
    }

    crearFiltroCI(valor) {
        /**
         * Crea un filtro case-insensitive para Sequelize
         * Busca ignorando mayúsculas y minúsculas
         */
        if (!valor) return null;

        return {
            [Op.iLike]: valor.trim()
        };
    }

    extraerCodigo(valor) {
        if (!valor) return null;
        const partes = valor.split('-');
        return partes[0] ? partes[0].trim() : null;
    }

    extraerDescripcion(valor) {
        if (!valor) return null;
        const partes = valor.split('-');
        return partes[1] ? partes[1].trim() : valor.trim();
    }

    async procesarFila(fila) {
        try {
            // Validar que la fila tenga datos
            if (!fila || Object.keys(fila).length === 0) {
                throw new Error('Fila vacía');
            }

            // JERARQUÍA DE CREACIÓN: Primero lo que no depende de nada

            // 1. NIVEL 1 - Entidades independientes (sin dependencias)

            // Obtener o crear Proveedor (LINEA)
            const proveedor = await this.obtenerOCrearRegistro(
                this.proveedor,
                { nombre: { [Op.iLike]: fila['LINEA']?.trim() } },
                { nombre: fila['LINEA']?.trim() }
            );
            if (!proveedor) throw new Error('No se pudo crear proveedor');

            // Obtener o crear Megacategoría
            const megacategoria = await this.obtenerOCrearRegistro(
                this.megacategoria,
                { nombre: { [Op.iLike]: fila['MEGACATEGORIA']?.trim() } },
                { nombre: fila['MEGACATEGORIA']?.trim() }
            );
            if (!megacategoria) throw new Error('No se pudo crear megacategoría');

            // Obtener o crear Canal
            const canal = await this.obtenerOCrearRegistro(
                this.canal,
                { nombre: { [Op.iLike]: fila['CANAL']?.trim() } },
                { nombre: fila['CANAL']?.trim() }
            );
            if (!canal) throw new Error('No se pudo crear canal');

            // Obtener o crear Ciudad
            const ciudad = await this.obtenerOCrearRegistro(
                this.ciudad,
                { nombre: { [Op.iLike]: fila['Desc. ciudad']?.trim() } },
                { nombre: fila['Desc. ciudad']?.trim() }
            );
            if (!ciudad) throw new Error('No se pudo crear ciudad');

            // Obtener o crear Tipo de Negocio
            const tipoNegocio = await this.obtenerOCrearRegistro(
                this.tipo_negocio,
                { tipo_negocio: { [Op.iLike]: fila['TIPO DE NEGOCIO']?.trim() } },
                {
                    tipo_negocio: fila['TIPO DE NEGOCIO']?.trim(),
                    detalle_tipo_negocio: fila['DETALLE TIPO DE NEGOCIO']?.trim()
                }
            );
            if (!tipoNegocio) throw new Error('No se pudo crear tipo de negocio');

            // 2. NIVEL 2 - Entidades que dependen de NIVEL 1

            // Obtener o crear Categoría (depende de Megacategoría)
            const categoria = await this.obtenerOCrearRegistro(
                this.categoria,
                { nombre: { [Op.iLike]: fila['CATEGORIA']?.trim() }, id_megacategoria: megacategoria.id_megacategoria },
                {
                    nombre: fila['CATEGORIA']?.trim(),
                    id_megacategoria: megacategoria.id_megacategoria
                }
            );
            if (!categoria) throw new Error('No se pudo crear categoría');

            // Obtener o crear Subcanal (depende de Canal)
            const subcanal = await this.obtenerOCrearRegistro(
                this.subcanal,
                { nombre: { [Op.iLike]: fila['SUBCANAL']?.trim() }, id_canal: canal.id_canal },
                {
                    nombre: fila['SUBCANAL']?.trim(),
                    id_canal: canal.id_canal
                }
            );
            if (!subcanal) throw new Error('No se pudo crear subcanal');

            // Obtener o crear Barrio (depende de Ciudad)
            const barrio = await this.obtenerOCrearRegistro(
                this.barrio,
                { nombre: { [Op.iLike]: fila['Barrio']?.trim() }, id_ciudad: ciudad.id_ciudad },
                {
                    nombre: fila['Barrio']?.trim(),
                    id_ciudad: ciudad.id_ciudad
                }
            );
            if (!barrio) throw new Error('No se pudo crear barrio');

            // 3. NIVEL 3 - Entidades que dependen de NIVEL 2

            // Obtener o crear Subcategoría (depende de Categoría)
            const subcategoria = await this.obtenerOCrearRegistro(
                this.subcategoria,
                { nombre: { [Op.iLike]: fila['SUBCATEGORIA']?.trim() }, id_categoria: categoria.id_categoria },
                {
                    nombre: fila['SUBCATEGORIA']?.trim(),
                    id_categoria: categoria.id_categoria
                }
            );
            if (!subcategoria) throw new Error('No se pudo crear subcategoría');

            // Obtener o crear Cliente (depende de Ciudad, Barrio, TipoNegocio)
            const cliente = await this.obtenerOCrearRegistro(
                this.cliente,
                { nro_documento: { [Op.iLike]: fila['Cliente factura']?.trim() } },
                {
                    nro_documento: fila['Cliente factura']?.trim(),
                    razon_social: fila['Razon social cliente factura']?.trim(),
                    sucursal: fila['Nombre establecimiento  facturar']?.trim(),
                    direccion: fila['Direccion 1']?.trim(),
                    id_ciudad: ciudad.id_ciudad,
                    id_barrio: barrio.id_barrio,
                    id_tipo_negocio: tipoNegocio.id_tipo_negocio
                }
            );
            if (!cliente) throw new Error('No se pudo crear cliente');

            // Obtener o crear Vendedor
            const vendedor = await this.obtenerOCrearRegistro(
                this.vendedor,
                { codigo_vendedor: { [Op.iLike]: fila['Codigo vendedor']?.trim() } },
                {
                    codigo_vendedor: fila['Codigo vendedor']?.trim(),
                    nombre: fila['Nombre vendedor']?.trim()
                }
            );
            if (!vendedor) throw new Error('No se pudo crear vendedor');

            // 4. NIVEL 4 - Item (depende de Megacategoría, Categoría, Subcategoría, Proveedor)

            // Obtener o crear Obsequio (si existe REPORTE PROV CON OBS) - antes que Item
            let obsequio = null;
            if (fila['REPORTE PROV CON OBS']?.trim()) {
                obsequio = await this.obtenerOCrearRegistro(
                    this.obsequio,
                    { descripcion: { [Op.iLike]: fila['REPORTE PROV CON OBS']?.trim() } },
                    {
                        descripcion: fila['REPORTE PROV CON OBS']?.trim(),
                        valor_obsequio: this.normalizarValor(fila['Valor subtotal'])
                    }
                );
            }

            // Obtener o crear Item
            const item = await this.obtenerOCrearRegistro(
                this.item,
                { codigo_item: { [Op.iLike]: fila['Item']?.trim() } },
                {
                    codigo_item: fila['Item']?.trim(),
                    descripcion: fila['Desc. item']?.trim(),
                    unidad_medida_orden: fila['U.M. Orden']?.trim(),
                    factor_um_empaque: parseFloat(fila['Factor U.M. emp.']) || 1,
                    factor_um_orden: parseFloat(fila['Factor U.M. Orden']) || 1,
                    peso_kilo: parseFloat(fila['Peso en KILO']) || 0,
                    id_categoria: categoria.id_categoria,
                    id_subcategoria: subcategoria.id_subcategoria,
                    id_megacategoria: megacategoria.id_megacategoria,
                    id_proveedor: proveedor.id_proveedor,
                    id_obsequio: obsequio ? obsequio.id_obsequio : null
                }
            );
            if (!item) throw new Error('No se pudo crear item');

            // 5. NIVEL 5 - Venta (depende de Cliente, Vendedor, Canal, Subcanal)

            const venta = await this.venta.create({
                numero_documento: fila['Nro documento']?.trim(),
                fecha: this.parsearFecha(fila['Fecha']),
                id_cliente: cliente.id_cliente,
                id_vendedor: vendedor.id_vendedor,
                id_canal: canal.id_canal,
                id_subcanal: subcanal.id_subcanal,
                precio_unitario_con_impuesto: this.normalizarValor(fila['Valor bruto']),
                valor_impuestos: this.normalizarValor(fila['Valor impuestos']),
                valor_neto: this.normalizarValor(fila['Valor neto']),
                margen_promedio: parseFloat(fila['Margen promedio']) || 0,
                impuesto_afecta_margen: fila['Impuesto afecta margen']?.trim(),
                condicion_pago: fila['Cond. pago fact']?.trim()
            });
            if (!venta) throw new Error('No se pudo crear venta');

            // 6. NIVEL 6 - Detalle Venta (depende de Venta e Item)

            const detalleVenta = await this.detalle_venta.create({
                id_venta: venta.id_venta,
                id_item: item.id_item,
                cantidad_emp: parseFloat(fila['Cantidad emp.']) || 0,
                cantidad: parseFloat(fila['Cantidad']) || 0,
                precio_unitario: this.normalizarValor(fila['Costo promedio total']),
                descuento: this.normalizarValor(fila['Valor descuentos']),
                subtotal: this.normalizarValor(fila['Valor subtotal'])
            });
            if (!detalleVenta) throw new Error('No se pudo crear detalle venta');

            return { venta, detalleVenta };

        } catch (error) {
            this.estadisticas.errores++;

            if (this.verbose) {
                console.error(`❌ Error en fila ${this.estadisticas.totalLineas}:`, error.message);
                this.estadisticas.erroresDetallados.push({
                    numFila: this.estadisticas.totalLineas,
                    error: error.message,
                    fila: fila
                });
            }

            return null;
        }
    }

    async procesarBatch(filas, encabezados) {
        for (const linea of filas) {
            this.estadisticas.totalLineas++;

            const fila = this.parsearLinea(linea, encabezados);
            const resultado = await this.procesarFila(fila);

            if (resultado) {
                this.estadisticas.exitosas++;
            }
        }
    }

    async importar(rutaArchivo) {
        this.estadisticas.tiempoInicio = Date.now();

        return new Promise(async (resolve, reject) => {
            try {
                const fileStream = fs.createReadStream(rutaArchivo, { encoding: 'utf8' });
                const rl = readline.createInterface({
                    input: fileStream,
                    crlfDelay: Infinity
                });

                let encabezados = [];
                let batch = [];
                let esEncabezado = true;

                rl.on('line', async (linea) => {
                    if (esEncabezado) {
                        encabezados = linea.split('\t').map(h => h.trim());
                        esEncabezado = false;
                        console.log(`✅ Encabezados detectados: ${encabezados.length} columnas`);
                        return;
                    }

                    batch.push(linea);

                    if (batch.length >= this.batchSize) {
                        rl.pause();

                        await this.procesarBatch(batch, encabezados);
                        console.log(`📊 Procesadas ${this.estadisticas.totalLineas} filas... (${this.estadisticas.exitosas} exitosas, ${this.estadisticas.errores} errores)`);

                        batch = [];
                        rl.resume();
                    }
                });

                rl.on('close', async () => {
                    // Procesar batch final
                    if (batch.length > 0) {
                        await this.procesarBatch(batch, encabezados);
                    }

                    this.estadisticas.tiempoFin = Date.now();
                    this.mostrarResumen();

                    resolve(this.estadisticas);
                });

                rl.on('error', reject);

            } catch (error) {
                reject(error);
            }
        });
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

module.exports = ImportadorVentas;