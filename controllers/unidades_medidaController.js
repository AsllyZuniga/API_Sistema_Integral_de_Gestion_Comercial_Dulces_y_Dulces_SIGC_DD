const db = require("../models");
const unidades_medida = db.unidades_medida_model;
const ventas_detalle = db.ventas_detalle_model;
module.exports = {
  list(req, res) {
    return unidades_medida
      .findAll({})
      .then((unidades_medida) => res.status(200).send(unidades_medida))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return unidades_medida
      .findByPk(req.params.id)
      .then((unidades_medida) => {
        console.log(unidades_medida);
        if (!unidades_medida) {
          return res.status(404).send({
            message: "unidades_medida Not Found",
          });
        }
        return res.status(200).send(unidades_medida);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return unidades_medida
      .create({
        codigo: req.body.codigo,
        
      })
      .then((unidades_medida) => res.status(201).send(unidades_medida))
      .catch((error) => res.status(400).send(error));
  },
  update(req, res) {
 return unidades_medida
 .findByPk(req.params.id)
 .then(unidades_medida => {
 if (!unidades_medida) {
 return res.status(404).send({
 message: 'unidades_medida Not Found',
 });
 }
 return unidades_medida
 .update({
 codigo: req.body.codigo || unidades_medida.codigo,
 nombre: req.body.nombre || unidades_medida.nombre,
 
 })
 .then(() => res.status(200).send(unidades_medida))
 .catch((error) => res.status(400).send(error));
 })
 .catch((error) => res.status(400).send(error));
 },
};
