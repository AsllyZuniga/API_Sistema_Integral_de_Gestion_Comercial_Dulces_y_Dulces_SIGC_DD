const { Op } = require('sequelize');
const db = require('../models');

const Vendedores = db.vendedores_model;
const Ventas = db.ventas_model;
const VentasDetalle = db.ventas_detalle_model;
const CuotasVendedores = db.cuotas_vendedores_model;
const CuotaMes = db.cuota_mes_model;
const RegistroDias = db.registro_dias_model;

module.exports = {
    async getCumplimientoCuotaMes(req, res) {
        try {
            // 1. Obtener registro de días para los cálculos de proyección
            const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
            if (!diasInfo) return res.status(404).send({ message: "No se encontró registro de días." });

            const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
            const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

            // 2. Obtener todos los vendedores e intentar traer su cuota (sin filtro de fecha estricto)
            const vendedores = await Vendedores.findAll({
                attributes: ['id', 'codigo', 'nombre'],
                include: [{
                    model: CuotasVendedores,
                    as: 'cuotas',
                    include: [{
                        model: CuotaMes,
                        as: 'cuota_mes',
                        attributes: ['cuota'],
                        // OPCIÓN A: Comentamos el filtro de fecha para que traiga cualquier cuota asociada
                        // where: { fecha_inicio: diasInfo.fecha_inicio }, 
                        required: false
                    }]
                }]
            });

            // 3. Procesar datos
            const resultado = await Promise.all(vendedores.map(async (v) => {
                // Sumar ventas históricas totales del vendedor
                const sumResult = await VentasDetalle.sum('valor_neto', {
                    include: [{
                        model: Ventas,
                        as: 'venta',
                        attributes: [],
                        where: {
                            vendedor_id: v.id,
                            // OPCIÓN A: Comentamos el filtro de fecha para sumar registros de meses pasados
                            /* fecha: { [Op.between]: [diasInfo.fecha_inicio, diasInfo.fecha_fin] } */
                        }
                    }]
                }) || 0;

                const ventaAcum = parseFloat(sumResult);

                // Obtener la cuota (si tiene varias, toma la primera disponible)
                let cuotaMes = 0;
                if (v.cuotas && v.cuotas.length > 0) {
                    const relacionCuota = v.cuotas.find(c => c.cuota_mes);
                    cuotaMes = relacionCuota ? parseFloat(relacionCuota.cuota_mes.cuota) : 0;
                }

                // Cálculos
                const porcCump = cuotaMes > 0 ? (ventaAcum / cuotaMes) : 0;
                const proyVenta = (ventaAcum / dCorridos) * dHabiles;
                const porcCumpProy = cuotaMes > 0 ? (proyVenta / cuotaMes) : 0;

                return {
                    codVendedor: v.codigo.trim(),
                    nombre: v.nombre.trim(),
                    cuotaMes: cuotaMes,
                    ventaAcum: ventaAcum,
                    porcCump: (porcCump * 100).toFixed(2) + '%',
                    proyeccionVenta: proyVenta.toFixed(2),
                    porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
                };
            }));

            // 4. Totales Numéricos
            const totales = resultado.reduce((acc, curr) => {
                acc.cuotaMes += curr.cuotaMes;
                acc.ventaAcum += curr.ventaAcum;
                acc.proyVenta += parseFloat(curr.proyeccionVenta);
                return acc;
            }, { cuotaMes: 0, ventaAcum: 0, proyVenta: 0 });

            const totalRow = {
                codVendedor: 'TOTALES',
                nombre: '',
                cuotaMes: totales.cuotaMes,
                ventaAcum: totales.ventaAcum.toFixed(2),
                porcCump: totales.cuotaMes > 0 ? ((totales.ventaAcum / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%',
                proyeccionVenta: totales.proyVenta.toFixed(2),
                porcCumProy: totales.cuotaMes > 0 ? ((totales.proyVenta / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%'
            };

            res.status(200).send({
                data: resultado.map(r => ({ ...r, ventaAcum: r.ventaAcum.toFixed(2) })),
                totales: totalRow
            });

        } catch (error) {
            res.status(500).send({ message: "Error", error: error.message });
        }
    },
    // NUEVA FUNCIÓN: Filtrar por código de vendedor
    async getCumplimientoPorCodigo(req, res) {
        try {
            const { codigo } = req.params; // Se recibe el código desde la URL

            const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
            if (!diasInfo) return res.status(404).send({ message: "Registro de días no encontrado." });

            const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
            const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

            // Buscamos solo UN vendedor por su código
            const v = await Vendedores.findOne({
                where: { codigo: codigo },
                attributes: ['id', 'codigo', 'nombre'],
                include: [{
                    model: CuotasVendedores,
                    as: 'cuotas',
                    include: [{
                        model: CuotaMes,
                        as: 'cuota_mes',
                        attributes: ['cuota'],
                        required: false
                    }]
                }]
            });

            if (!v) {
                return res.status(404).send({ message: `Vendedor con código ${codigo} no encontrado.` });
            }

            // Sumamos sus ventas
            const sumResult = await VentasDetalle.sum('valor_neto', {
                include: [{
                    model: Ventas,
                    as: 'venta',
                    attributes: [],
                    where: { vendedor_id: v.id }
                }]
            }) || 0;

            const ventaAcum = parseFloat(sumResult);

            let cuotaMes = 0;
            if (v.cuotas && v.cuotas.length > 0) {
                const relacionCuota = v.cuotas.find(c => c.cuota_mes);
                cuotaMes = relacionCuota ? parseFloat(relacionCuota.cuota_mes.cuota) : 0;
            }

            const porcCump = cuotaMes > 0 ? (ventaAcum / cuotaMes) : 0;
            const proyVenta = (ventaAcum / dCorridos) * dHabiles;
            const porcCumpProy = cuotaMes > 0 ? (proyVenta / cuotaMes) : 0;

            res.status(200).send({
                codVendedor: v.codigo.trim(),
                nombre: v.nombre.trim(),
                cuotaMes: cuotaMes,
                ventaAcum: ventaAcum.toFixed(2),
                porcCump: (porcCump * 100).toFixed(2) + '%',
                proyeccionVenta: proyVenta.toFixed(2),
                porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
            });

        } catch (error) {
            res.status(500).send({ message: "Error al filtrar por código", error: error.message });
        }
    },
    // NUEVA FUNCIÓN: Filtrar cumplimiento de todos los vendedores por NOMBRE DE LÍNEA
    async getCumplimientoPorLinea(req, res) {
        try {
            // 1. Unificar el nombre de la variable
            const linea = req.params.linea || req.query.linea;

            if (!linea) {
                return res.status(400).send({ message: "Debe proporcionar el nombre de la línea." });
            }

            const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
            const dCorridos = parseFloat(diasInfo?.dias_corridos) || 1;
            const dHabiles = parseFloat(diasInfo?.dias_habiles) || 1;

            const vendedores = await Vendedores.findAll({
                attributes: ['id', 'codigo', 'nombre'],
                include: [{
                    model: CuotasVendedores,
                    as: 'cuotas',
                    include: [{
                        model: CuotaMes,
                        as: 'cuota_mes',
                        attributes: ['cuota'],
                        required: false
                    }]
                }]
            });

            const resultado = await Promise.all(vendedores.map(async (v) => {
                const sumResult = await VentasDetalle.sum('valor_neto', {
                    where: {
                        linea: {
                            // Usamos la variable 'linea' que definimos arriba
                            [Op.like]: `%${linea.trim()}%`
                        }
                    },
                    include: [{
                        model: Ventas,
                        as: 'venta',
                        attributes: [],
                        where: { vendedor_id: v.id }
                    }]
                }) || 0;

                const ventaAcum = parseFloat(sumResult);

                let cuotaMes = 0;
                if (v.cuotas && v.cuotas.length > 0) {
                    // Buscamos la relación que tenga cuota_mes
                    const relacion = v.cuotas.find(c => c.cuota_mes);
                    cuotaMes = relacion ? parseFloat(relacion.cuota_mes.cuota) : 0;
                }

                const porcCump = cuotaMes > 0 ? (ventaAcum / cuotaMes) : 0;
                const proyVenta = (ventaAcum / dCorridos) * dHabiles;
                const porcCumpProy = cuotaMes > 0 ? (proyVenta / cuotaMes) : 0;

                return {
                    codVendedor: v.codigo ? v.codigo.trim() : '',
                    nombre: v.nombre ? v.nombre.trim() : '',
                    cuotaMes: cuotaMes,
                    ventaAcum: ventaAcum,
                    porcCump: (porcCump * 100).toFixed(2) + '%',
                    proyeccionVenta: proyVenta.toFixed(2),
                    porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
                };
            }));

            // 3. Calcular Totales (asegurando valores numéricos)
            const totales = resultado.reduce((acc, curr) => {
                acc.cuotaMes += curr.cuotaMes;
                acc.ventaAcum += curr.ventaAcum;
                acc.proyVenta += parseFloat(curr.proyeccionVenta);
                return acc;
            }, { cuotaMes: 0, ventaAcum: 0, proyVenta: 0 });

            res.status(200).send({
                lineaFiltrada: linea, // Variable corregida
                data: resultado.map(r => ({ ...r, ventaAcum: r.ventaAcum.toFixed(2) })),
                totales: {
                    codVendedor: 'TOTALES',
                    nombre: '',
                    cuotaMes: totales.cuotaMes,
                    ventaAcum: totales.ventaAcum.toFixed(2),
                    porcCump: totales.cuotaMes > 0 ? ((totales.ventaAcum / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%',
                    proyeccionVenta: totales.proyVenta.toFixed(2),
                    porcCumProy: totales.cuotaMes > 0 ? ((totales.proyVenta / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%'
                }
            });

        } catch (error) {
            console.error(error); // Recomendado para debug
            res.status(500).send({ message: "Error", error: error.message });
        }
    },
    async getCumplimientoVendedorYLinea(req, res) {
        try {
            // Obtenemos el código de la URL y la línea de la consulta (?linea=...)
            const { codigo } = req.params;
            const linea = req.query.linea || req.params.linea;

            if (!codigo || !linea) {
                return res.status(400).send({
                    message: "Debe proporcionar el código del vendedor y el nombre de la línea."
                });
            }

            const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
            const dCorridos = parseFloat(diasInfo?.dias_corridos) || 1;
            const dHabiles = parseFloat(diasInfo?.dias_habiles) || 1;

            // 1. Buscamos al vendedor específico
            const v = await Vendedores.findOne({
                where: { codigo: codigo },
                attributes: ['id', 'codigo', 'nombre'],
                include: [{
                    model: CuotasVendedores,
                    as: 'cuotas',
                    include: [{
                        model: CuotaMes,
                        as: 'cuota_mes',
                        attributes: ['cuota'],
                        required: false
                    }]
                }]
            });

            if (!v) {
                return res.status(404).send({ message: "Vendedor no encontrado." });
            }

            // 2. Sumamos las ventas filtrando por ese Vendedor Y esa Línea
            const sumResult = await VentasDetalle.sum('valor_neto', {
                where: {
                    linea: { [Op.like]: `%${linea.trim()}%` }
                },
                include: [{
                    model: Ventas,
                    as: 'venta',
                    attributes: [],
                    where: { vendedor_id: v.id }
                }]
            }) || 0;

            const ventaAcum = parseFloat(sumResult);

            // 3. Extraer cuota
            let cuotaMes = 0;
            if (v.cuotas && v.cuotas.length > 0) {
                const relacion = v.cuotas.find(c => c.cuota_mes);
                cuotaMes = relacion ? parseFloat(relacion.cuota_mes.cuota) : 0;
            }

            // 4. Cálculos
            const porcCump = cuotaMes > 0 ? (ventaAcum / cuotaMes) : 0;
            const proyVenta = (ventaAcum / dCorridos) * dHabiles;
            const porcCumpProy = cuotaMes > 0 ? (proyVenta / cuotaMes) : 0;

            // 5. Respuesta
            res.status(200).send({
                codVendedor: v.codigo.trim(),
                nombre: v.nombre.trim(),
                lineaFiltrada: linea.trim(),
                cuotaMes: cuotaMes,
                ventaAcum: ventaAcum.toFixed(2),
                porcCump: (porcCump * 100).toFixed(2) + '%',
                proyeccionVenta: proyVenta.toFixed(2),
                porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
            });

        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Error al filtrar por vendedor y línea", error: error.message });
        }
    }
};

