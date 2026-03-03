// services/cumplimientoMesService.js
const { Op } = require('sequelize');
const db = require('../models');

const Vendedores = db.vendedores_model;
const Ventas = db.ventas_model;
const VentasDetalle = db.ventas_detalle_model;
const CuotasVendedores = db.cuotas_vendedores_model;
const CuotaMes = db.cuota_mes_model;
const RegistroDias = db.registro_dias_model;
const Clientes = db.clientes_model;
const Productos = db.productos_model;

// HELPER: Construye dinámicamente el filtro de la tabla Ventas
// Si fechaInicio y fechaFin existen, agrega el filtro de fechas. Si no, solo filtra por vendedor.
function buildWhereVenta(vendedorId, fechaInicio, fechaFin) {
    let where = {};
    if (vendedorId) where.vendedor_id = vendedorId;
    if (fechaInicio && fechaFin) {
        where.fecha = { [Op.between]: [fechaInicio, fechaFin] };
    }
    return where;
}

async function getCumplimientoCuotaMesService(fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('No se encontró registro de días.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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
            include: [{
                model: Ventas,
                as: 'venta',
                attributes: [],
                where: buildWhereVenta(v.id, fechaInicio, fechaFin) // Filtro dinámico aplicado
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

    const totales = resultado.reduce((acc, curr) => {
        acc.cuotaMes += curr.cuotaMes;
        acc.ventaAcum += curr.ventaAcum;
        acc.proyVenta += parseFloat(curr.proyeccionVenta);
        return acc;
    }, { cuotaMes: 0, ventaAcum: 0, proyVenta: 0 });

    const totalRow = {
        codVendedor: 'TOTALES',
        nombre: (fechaInicio && fechaFin) ? `RANGO: ${fechaInicio} al ${fechaFin}` : '',
        cuotaMes: totales.cuotaMes,
        ventaAcum: totales.ventaAcum.toFixed(2),
        porcCump: totales.cuotaMes > 0 ? ((totales.ventaAcum / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%',
        proyeccionVenta: totales.proyVenta.toFixed(2),
        porcCumProy: totales.cuotaMes > 0 ? ((totales.proyVenta / totales.cuotaMes) * 100).toFixed(2) + '%' : '0.00%'
    };

    return {
        filtros: { fechaInicio, fechaFin },
        data: resultado.map(r => ({ ...r, ventaAcum: r.ventaAcum.toFixed(2) })),
        totales: totalRow
    };
}

async function getCumplimientoPorCodigoService(codigo, fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('Registro de días no encontrado.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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

    if (!v) throw new Error(`Vendedor con código ${codigo} no encontrado.`);

    const sumResult = await VentasDetalle.sum('valor_neto', {
        include: [{
            model: Ventas,
            as: 'venta',
            attributes: [],
            where: buildWhereVenta(v.id, fechaInicio, fechaFin)
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

    return {
        filtros: { fechaInicio, fechaFin },
        codVendedor: v.codigo.trim(),
        nombre: v.nombre.trim(),
        cuotaMes: cuotaMes,
        ventaAcum: ventaAcum.toFixed(2),
        porcCump: (porcCump * 100).toFixed(2) + '%',
        proyeccionVenta: proyVenta.toFixed(2),
        porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
    };
}

async function getCumplimientoPorLineaService(linea, fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('No se encontró registro de días.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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
                linea: { [Op.like]: `%${linea.trim()}%` }
            },
            include: [{
                model: Ventas,
                as: 'venta',
                attributes: [],
                where: buildWhereVenta(v.id, fechaInicio, fechaFin)
            }]
        }) || 0;

        const ventaAcum = parseFloat(sumResult);

        let cuotaMes = 0;
        if (v.cuotas && v.cuotas.length > 0) {
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

    const totales = resultado.reduce((acc, curr) => {
        acc.cuotaMes += curr.cuotaMes;
        acc.ventaAcum += curr.ventaAcum;
        acc.proyVenta += parseFloat(curr.proyeccionVenta);
        return acc;
    }, { cuotaMes: 0, ventaAcum: 0, proyVenta: 0 });

    return {
        filtros: { fechaInicio, fechaFin },
        lineaFiltrada: linea,
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
    };
}

async function getCumplimientoVendedorYLineaService(codigo, linea, fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('Registro de días no encontrado.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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

    if (!v) throw new Error('Vendedor no encontrado.');

    const sumResult = await VentasDetalle.sum('valor_neto', {
        where: {
            linea: { [Op.like]: `%${linea.trim()}%` }
        },
        include: [{
            model: Ventas,
            as: 'venta',
            attributes: [],
            where: buildWhereVenta(v.id, fechaInicio, fechaFin)
        }]
    }) || 0;

    const ventaAcum = parseFloat(sumResult);

    let cuotaMes = 0;
    if (v.cuotas && v.cuotas.length > 0) {
        const relacion = v.cuotas.find(c => c.cuota_mes);
        cuotaMes = relacion ? parseFloat(relacion.cuota_mes.cuota) : 0;
    }

    const porcCump = cuotaMes > 0 ? (ventaAcum / cuotaMes) : 0;
    const proyVenta = (ventaAcum / dCorridos) * dHabiles;
    const porcCumpProy = cuotaMes > 0 ? (proyVenta / cuotaMes) : 0;

    return {
        filtros: { fechaInicio, fechaFin },
        codVendedor: v.codigo.trim(),
        nombre: v.nombre.trim(),
        lineaFiltrada: linea.trim(),
        cuotaMes: cuotaMes,
        ventaAcum: ventaAcum.toFixed(2),
        porcCump: (porcCump * 100).toFixed(2) + '%',
        proyeccionVenta: proyVenta.toFixed(2),
        porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
    };
}

async function getCumplimientoVendedorDetalleLineasService(codigo, fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('Registro de días no encontrado.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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

    if (!v) throw new Error('Vendedor no encontrado.');

    let cuotaGeneral = 0;
    if (v.cuotas && v.cuotas.length > 0) {
        const relacion = v.cuotas.find(c => c.cuota_mes);
        cuotaGeneral = relacion ? parseFloat(relacion.cuota_mes.cuota) : 0;
    }

    const ventasPorLinea = await VentasDetalle.findAll({
        attributes: [
            'linea',
            [db.sequelize.fn('SUM', db.sequelize.col('valor_neto')), 'totalVenta']
        ],
        where: { linea: { [Op.ne]: null } },
        include: [{
            model: Ventas,
            as: 'venta',
            attributes: [],
            where: buildWhereVenta(v.id, fechaInicio, fechaFin)
        }],
        group: ['ventas_detalle_model.linea']
    });

    const lineasResult = ventasPorLinea.map(item => {
        const nombreLinea = item.linea ? item.linea.trim() : 'SIN LÍNEA';
        const ventaAcum = parseFloat(item.getDataValue('totalVenta')) || 0;

        const porcCump = cuotaGeneral > 0 ? (ventaAcum / cuotaGeneral) : 0;
        const proyVenta = (ventaAcum / dCorridos) * dHabiles;
        const porcCumpProy = cuotaGeneral > 0 ? (proyVenta / cuotaGeneral) : 0;

        return {
            linea: nombreLinea,
            ventaAcum: ventaAcum.toFixed(2),
            porcCump: (porcCump * 100).toFixed(2) + '%',
            proyeccionVenta: proyVenta.toFixed(2),
            porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
        };
    });

    return {
        filtros: { fechaInicio, fechaFin },
        vendedor: v.nombre.trim(),
        codigo: v.codigo.trim(),
        cuotaMensualGeneral: cuotaGeneral,
        totalVentaTodasLineas: lineasResult.reduce((acc, l) => acc + parseFloat(l.ventaAcum), 0).toFixed(2),
        detallePorLinea: lineasResult
    };
}

async function getCumplimientoVendedorPorCiudadService(codigo, fechaInicio, fechaFin) {
    const diasInfo = await RegistroDias.findOne({ order: [['id', 'DESC']] });
    if (!diasInfo) throw new Error('Registro de días no encontrado.');

    const dCorridos = parseFloat(diasInfo.dias_corridos) || 1;
    const dHabiles = parseFloat(diasInfo.dias_habiles) || 1;

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

    if (!v) throw new Error('Vendedor no encontrado.');

    let cuotaGeneral = 0;
    if (v.cuotas && v.cuotas.length > 0) {
        const relacion = v.cuotas.find(c => c.cuota_mes);
        cuotaGeneral = relacion ? parseFloat(relacion.cuota_mes.cuota) : 0;
    }

    const ventasPorCiudad = await VentasDetalle.findAll({
        attributes: [
            [db.sequelize.col('venta.cliente.ciudad'), 'ciudad'],
            [db.sequelize.fn('SUM', db.sequelize.col('valor_neto')), 'totalVenta']
        ],
        include: [{
            model: Ventas,
            as: 'venta',
            attributes: [],
            where: buildWhereVenta(v.id, fechaInicio, fechaFin),
            include: [{
                model: Clientes,
                as: 'cliente',
                attributes: []
            }]
        }],
        group: [db.sequelize.col('venta.cliente.ciudad')],
        raw: true
    });

    const ciudadesResult = ventasPorCiudad.map(item => {
        const nombreCiudad = item.ciudad ? item.ciudad.trim() : 'SIN CIUDAD';
        const ventaAcum = parseFloat(item.totalVenta) || 0;

        const porcCump = cuotaGeneral > 0 ? (ventaAcum / cuotaGeneral) : 0;
        const proyVenta = (ventaAcum / dCorridos) * dHabiles;
        const porcCumpProy = cuotaGeneral > 0 ? (proyVenta / cuotaGeneral) : 0;

        return {
            ciudad: nombreCiudad,
            ventaAcum: ventaAcum.toFixed(2),
            porcCump: (porcCump * 100).toFixed(2) + '%',
            proyeccionVenta: proyVenta.toFixed(2),
            porcCumProy: (porcCumpProy * 100).toFixed(2) + '%'
        };
    });

    return {
        filtros: { fechaInicio, fechaFin },
        vendedor: v.nombre.trim(),
        codigo: v.codigo.trim(),
        cuotaMensualGeneral: cuotaGeneral,
        totalVentaTodasCiudades: ciudadesResult.reduce((acc, c) => acc + parseFloat(c.ventaAcum), 0).toFixed(2),
        detallePorCiudad: ciudadesResult
    };
}

async function getProductosVendidosPorVendedorService(codigo, fechaInicio, fechaFin) {
    const v = await Vendedores.findOne({
        where: { codigo: codigo },
        attributes: ['id', 'codigo', 'nombre']
    });

    if (!v) throw new Error('Vendedor no encontrado.');

    const productosVendidos = await VentasDetalle.findAll({
        attributes: [
            [db.sequelize.col('venta.fecha'), 'Fecha'],
            [db.sequelize.col('ventas_detalle_model.linea'), 'Proveedor'],
            [db.sequelize.col('producto.codigo'), 'Cod_Item'],
            [db.sequelize.col('producto.descripcion'), 'Descripcion'],
            // Suma de las Cajas
            [db.sequelize.fn('SUM', db.sequelize.col('ventas_detalle_model.cantidad_emp')), 'Venta_Unid_Cajas'],
            // NUEVO: Suma de la cantidad en unidades
            [db.sequelize.fn('SUM', db.sequelize.col('ventas_detalle_model.cantidad')), 'Cantidad'],
            // NUEVO: Suma del valor de la venta (usamos valor_neto para mantener coherencia con los otros reportes)
            [db.sequelize.fn('SUM', db.sequelize.col('ventas_detalle_model.valor_subtotal')), 'Subtotal']
        ],
        include: [
            {
                model: Ventas,
                as: 'venta',
                attributes: [],
                where: buildWhereVenta(v.id, fechaInicio, fechaFin)
            },
            {
                model: Productos,
                as: 'producto',
                attributes: []
            }
        ],
        group: [
            db.sequelize.col('venta.fecha'),
            db.sequelize.col('ventas_detalle_model.linea'),
            db.sequelize.col('producto.codigo'),
            db.sequelize.col('producto.descripcion')
        ],
        order: [
            [db.sequelize.col('venta.fecha'), 'DESC']
        ],
        raw: true
    });

    // Mapeamos y damos el orden estricto solicitado
    const resultadoFormateado = productosVendidos.map(item => ({
        Fecha: item.Fecha,
        Proveedor: item.Proveedor ? item.Proveedor.trim() : 'SIN PROVEEDOR',
        Cod_Item: item.Cod_Item ? item.Cod_Item.trim() : '',
        Descripcion: item.Descripcion ? item.Descripcion.trim() : '',
        Venta_Unid_Cajas: parseFloat(item.Venta_Unid_Cajas || 0).toFixed(2),
        Cantidad: parseFloat(item.Cantidad || 0).toFixed(2), // Agregado formato a 2 decimales
        Subtotal: parseFloat(item.Subtotal || 0).toFixed(2)  // Agregado formato a 2 decimales
    }));

    return {
        filtros: { fechaInicio, fechaFin },
        vendedor: v.nombre.trim(),
        codigo: v.codigo.trim(),
        totalFilas: resultadoFormateado.length,
        data: resultadoFormateado
    };
}

module.exports = {
    getCumplimientoCuotaMesService,
    getCumplimientoPorCodigoService,
    getCumplimientoPorLineaService,
    getCumplimientoVendedorYLineaService,
    getCumplimientoVendedorDetalleLineasService,
    getCumplimientoVendedorPorCiudadService,
    getProductosVendidosPorVendedorService
};