const db = require("../models");
const ventas = db.ventas_model;
const clientes = db.clientes_model;
const vendedores = db.vendedores_model;
const tiposDocumento = db.tipos_documento_model;
const ventasDetalle = db.ventas_detalle_model;
const productos = db.productos_model;
const unidadesMedida = db.unidades_medida_model;
module.exports = {
  list(req, res) {
    return ventas
      .findAll({})
      .then((ventas) => res.status(200).send(ventas))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return ventas
      .findByPk(req.params.id)
      .then((ventas) => {
        console.log(ventas);
        if (!ventas) {
          return res.status(404).send({
            message: "ventas Not Found",
          });
        }
        return res.status(200).send(ventas);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return ventas
      .create({
        tipo_documento_id: req.body.tipo_documento_id,
        numero_documento: req.body.numero_documento,
        fecha: req.body.fecha,
        cliente_id: req.body.cliente_id,
        vendedor_id: req.body.vendedor_id,
        sucursal: req.body.sucursal,
        canal: req.body.canal,
        linea: req.body.linea,
        nombre_establecimiento: req.body.nombre_establecimiento,
      })
      .then((ventas) => res.status(201).send(ventas))
      .catch((error) => res.status(400).send(error));
  },
  update(req, res) {
    return ventas
      .findByPk(req.params.id)
      .then((ventas) => {
        if (!ventas) {
          return res.status(404).send({
            message: "ventas Not Found",
          });
        }
        return ventas
          .update({
            tipo_documento_id:
              req.body.tipo_documento_id || ventas.tipo_documento_id,
            numero_documento:
              req.body.numero_documento || ventas.numero_documento,
            fecha: req.body.fecha || ventas.fecha,
            cliente_id: req.body.cliente_id || ventas.cliente_id,
            vendedor_id: req.body.vendedor_id || ventas.vendedor_id,
            sucursal: req.body.sucursal || ventas.sucursal,
            canal: req.body.canal || ventas.canal,
            linea: req.body.linea || ventas.linea,
            nombre_establecimiento:
              req.body.nombre_establecimiento || ventas.nombre_establecimiento,
          })
          .then(() => res.status(200).send(ventas))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
