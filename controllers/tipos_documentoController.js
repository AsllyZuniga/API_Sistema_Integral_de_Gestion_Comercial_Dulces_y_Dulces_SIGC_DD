const db = require("../models");
const tipos_documento = db.tipos_documento_model;
const ventas = db.ventas_model;
module.exports = {
  list(req, res) {
    return tipos_documento
      .findAll({})
      .then((tipos_documento) => res.status(200).send(tipos_documento))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return tipos_documento
      .findByPk(req.params.id)
      .then((tipos_documento) => {
        console.log(tipos_documento);
        if (!tipos_documento) {
          return res.status(404).send({
            message: "tipos_documento Not Found",
          });
        }
        return res.status(200).send(tipos_documento);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return tipos_documento
      .create({
        codigo: req.body.codigo,
        descripcion: req.body.descripcion,
        afecta_venta: req.body.afecta_venta,
      })
      .then((tipos_documento) => res.status(201).send(tipos_documento))
      .catch((error) => res.status(400).send(error));
  },
  update(req, res) {
    return tipos_documento
      .findByPk(req.params.id)
      .then((tipos_documento) => {
        if (!tipos_documento) {
          return res.status(404).send({
            message: "tipos_documento Not Found",
          });
        }
        return tipos_documento
          .update({
            codigo: req.body.codigo || tipos_documento.codigo,
            descripcion: req.body.descripcion || tipos_documento.descripcion,
            afecta_venta: req.body.afecta_venta || tipos_documento.afecta_venta,
          })
          .then(() => res.status(200).send(tipos_documento))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
