const db = require("../models");
const clientes = db.clientes_model;
const ventas = db.ventas_model;
module.exports = {
  list(req, res) {
    return clientes
      .findAll({})
      .then((clientes) => res.status(200).send(clientes))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return clientes
      .findByPk(req.params.id)
      .then((clientes) => {
        console.log(clientes);
        if (!clientes) {
          return res.status(404).send({
            message: "clientes Not Found",
          });
        }
        return res.status(200).send(clientes);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return clientes
      .create({
        nro_documento: req.body.nro_documento,
        razon_social: req.body.razon_social,
        direccion: req.body.direccion,
        ciudad: req.body.ciudad,
        barrio: req.body.barrio,
        condicion_pago: req.body.condicion_pago,
        tipo_negocio: req.body.tipo_negocio,
        subcanal: req.body.subcanal,
        subcanal_detallado: req.body.subcanal_detallado,
      })
      .then((cliente) => res.status(201).send(cliente))
      .catch((error) => res.status(400).send(error));
  },

  update(req, res) {
    return clientes
      .findByPk(req.params.id)
      .then((cliente) => {
        if (!cliente) {
          return res.status(404).send({
            message: "Cliente not found",
          });
        }

        return cliente
          .update({
            nro_documento: req.body.nro_documento || cliente.nro_documento,
            razon_social: req.body.razon_social || cliente.razon_social,
            direccion: req.body.direccion || cliente.direccion,
            ciudad: req.body.ciudad || cliente.ciudad,
            barrio: req.body.barrio || cliente.barrio,
            condicion_pago: req.body.condicion_pago || cliente.condicion_pago,
            tipo_negocio: req.body.tipo_negocio || cliente.tipo_negocio,
            subcanal: req.body.subcanal || cliente.subcanal,
            subcanal_detallado:
              req.body.subcanal_detallado || cliente.subcanal_detallado,
          })
          .then(() => res.status(200).send(cliente))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
