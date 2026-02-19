const staging_ventas = require("../models").staging_ventas_model;
module.exports = {
  list(req, res) {
    return staging_ventas
      .findAll({})
      .then((staging_ventas) => res.status(200).send(staging_ventas))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return staging_ventas
      .findByPk(req.params.id)
      .then((staging_ventas) => {
        console.log(staging_ventas);
        if (!staging_ventas) {
          return res.status(404).send({
            message: "staging_ventas Not Found",
          });
        }
        return res.status(200).send(staging_ventas);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return staging_ventas
      .create({
        linea: req.body.linea,
        categoria: req.body.categoria,
        canal: req.body.canal,
        codigo_vendedor: req.body.codigo_vendedor,
        nombre_vendedor: req.body.nombre_vendedor,
        nro_documento: req.body.nro_documento,
        item: req.body.item,
        desc_item: req.body.desc_item,
        um_orden: req.body.um_orden,
        fecha: req.body.fecha,
        cliente_factura: req.body.cliente_factura,
        sucursal_factura: req.body.sucursal_factura,
        razon_social_cliente: req.body.razon_social_cliente,
        direccion_1: req.body.direccion_1,
        ciudad: req.body.ciudad,
        cantidad_emp: req.body.cantidad_emp,
        cantidad: req.body.cantidad,
        costo_promedio_total: req.body.costo_promedio_total,
        valor_bruto: req.body.valor_bruto,
        valor_descuentos: req.body.valor_descuentos,
        valor_subtotal: req.body.valor_subtotal,
        valor_impuestos: req.body.valor_impuestos,
        valor_neto: req.body.valor_neto,
        margen_promedio: req.body.margen_promedio,
        impuesto_afecta_margen: req.body.impuesto_afecta_margen,
        factor_um_emp: req.body.factor_um_emp,
        factor_um_orden: req.body.factor_um_orden,
        peso_kilo: req.body.peso_kilo,
        barrio: req.body.barrio,
        detalle_tipo_negocio: req.body.detalle_tipo_negocio,
        cond_pago_fact: req.body.cond_pago_fact,
        nombre_establecimiento: req.body.nombre_establecimiento,
        tipo_negocio: req.body.tipo_negocio,
        subcanal: req.body.subcanal,
        subcanal_detallado: req.body.subcanal_detallado,
        megacategoria: req.body.megacategoria,
        subcategoria: req.body.subcategoria,
      })
      .then((venta) => res.status(201).send(venta))
      .catch((error) => res.status(400).send(error));
  },

  update(req, res) {
    return staging_ventas
      .findByPk(req.params.id)
      .then((venta) => {
        if (!venta) {
          return res.status(404).send({
            message: "Venta not found",
          });
        }

        return venta
          .update({
            linea: req.body.linea ?? venta.linea,
            categoria: req.body.categoria ?? venta.categoria,
            canal: req.body.canal ?? venta.canal,
            codigo_vendedor: req.body.codigo_vendedor ?? venta.codigo_vendedor,
            nombre_vendedor: req.body.nombre_vendedor ?? venta.nombre_vendedor,
            nro_documento: req.body.nro_documento ?? venta.nro_documento,
            item: req.body.item ?? venta.item,
            desc_item: req.body.desc_item ?? venta.desc_item,
            um_orden: req.body.um_orden ?? venta.um_orden,
            fecha: req.body.fecha ?? venta.fecha,
            cliente_factura: req.body.cliente_factura ?? venta.cliente_factura,
            sucursal_factura:
              req.body.sucursal_factura ?? venta.sucursal_factura,
            razon_social_cliente:
              req.body.razon_social_cliente ?? venta.razon_social_cliente,
            direccion_1: req.body.direccion_1 ?? venta.direccion_1,
            ciudad: req.body.ciudad ?? venta.ciudad,
            cantidad_emp: req.body.cantidad_emp ?? venta.cantidad_emp,
            cantidad: req.body.cantidad ?? venta.cantidad,
            costo_promedio_total:
              req.body.costo_promedio_total ?? venta.costo_promedio_total,
            valor_bruto: req.body.valor_bruto ?? venta.valor_bruto,
            valor_descuentos:
              req.body.valor_descuentos ?? venta.valor_descuentos,
            valor_subtotal: req.body.valor_subtotal ?? venta.valor_subtotal,
            valor_impuestos: req.body.valor_impuestos ?? venta.valor_impuestos,
            valor_neto: req.body.valor_neto ?? venta.valor_neto,
            margen_promedio: req.body.margen_promedio ?? venta.margen_promedio,
            impuesto_afecta_margen:
              req.body.impuesto_afecta_margen ?? venta.impuesto_afecta_margen,
            factor_um_emp: req.body.factor_um_emp ?? venta.factor_um_emp,
            factor_um_orden: req.body.factor_um_orden ?? venta.factor_um_orden,
            peso_kilo: req.body.peso_kilo ?? venta.peso_kilo,
            barrio: req.body.barrio ?? venta.barrio,
            detalle_tipo_negocio:
              req.body.detalle_tipo_negocio ?? venta.detalle_tipo_negocio,
            cond_pago_fact: req.body.cond_pago_fact ?? venta.cond_pago_fact,
            nombre_establecimiento:
              req.body.nombre_establecimiento ?? venta.nombre_establecimiento,
            tipo_negocio: req.body.tipo_negocio ?? venta.tipo_negocio,
            subcanal: req.body.subcanal ?? venta.subcanal,
            subcanal_detallado:
              req.body.subcanal_detallado ?? venta.subcanal_detallado,
            megacategoria: req.body.megacategoria ?? venta.megacategoria,
            subcategoria: req.body.subcategoria ?? venta.subcategoria,
          })
          .then(() => res.status(200).send(venta))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
