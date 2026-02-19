const db = require("../models");
const ventas_detalle = db.ventas_detalle_model;
const ventas = db.ventas_model;
const productos = db.productos_model;
const unidadesMedida = db.unidades_medida_model;
module.exports = {
  list(req, res) {
    return ventas_detalle
      .findAll({})
      .then((ventas_detalle) => res.status(200).send(ventas_detalle))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return ventas_detalle
      .findByPk(req.params.id)
      .then((ventas_detalle) => {
        console.log(ventas_detalle);
        if (!ventas_detalle) {
          return res.status(404).send({
            message: "ventas_detalle Not Found",
          });
        }
        return res.status(200).send(ventas_detalle);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return ventas_detalle
      .create({
        venta_id: req.body.venta_id,
        producto_id: req.body.producto_id,
        unidad_medida_id: req.body.unidad_medida_id,
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
      })
      .then((ventas_detalle) => res.status(201).send(ventas_detalle))
      .catch((error) => res.status(400).send(error));
  },
  update(req, res) {
    return ventas_detalle
      .findByPk(req.params.id)
      .then((ventas_detalle) => {
        if (!ventas_detalle) {
          return res.status(404).send({
            message: "ventas_detalle Not Found",
          });
        }
        return ventas_detalle
          .update({
            venta_id: req.body.venta_id || ventas_detalle.venta_id,
            producto_id: req.body.producto_id || ventas_detalle.producto_id,
            unidad_medida_id:
              req.body.unidad_medida_id || ventas_detalle.unidad_medida_id,
            cantidad_emp: req.body.cantidad_emp || ventas_detalle.cantidad_emp,
            cantidad: req.body.cantidad || ventas_detalle.cantidad,
            costo_promedio_total:
              req.body.costo_promedio_total ||
              ventas_detalle.costo_promedio_total,
            valor_bruto: req.body.valor_bruto || ventas_detalle.valor_bruto,
            valor_descuentos:
              req.body.valor_descuentos || ventas_detalle.valor_descuentos,
            valor_subtotal:
              req.body.valor_subtotal || ventas_detalle.valor_subtotal,
            valor_impuestos:
              req.body.valor_impuestos || ventas_detalle.valor_impuestos,
            valor_neto: req.body.valor_neto || ventas_detalle.valor_neto,
            margen_promedio:
              req.body.margen_promedio || ventas_detalle.margen_promedio,
            impuesto_afecta_margen:
              req.body.impuesto_afecta_margen ||
              ventas_detalle.impuesto_afecta_margen,
            factor_um_emp:
              req.body.factor_um_emp || ventas_detalle.factor_um_emp,
            factor_um_orden:
              req.body.factor_um_orden || ventas_detalle.factor_um_orden,
            peso_kilo: req.body.peso_kilo || ventas_detalle.peso_kilo,
          })
          .then(() => res.status(200).send(ventas_detalle))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
