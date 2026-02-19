const vendedores = require("../models").vendedores_model;
module.exports = {
  list(req, res) {
    return vendedores
      .findAll({})
      .then((vendedores) => res.status(200).send(vendedores))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return vendedores
      .findByPk(req.params.id)
      .then((vendedores) => {
        console.log(vendedores);
        if (!vendedores) {
          return res.status(404).send({
            message: "vendedores Not Found",
          });
        }
        return res.status(200).send(vendedores);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return vendedores
      .create({
        codigo: req.body.codigo,
        nombre: req.body.nombre,
        status: req.body.status,
      })
      .then((vendedores) => res.status(201).send(vendedores))
      .catch((error) => res.status(400).send(error));
  },
  update(req, res) {
    return vendedores
      .findByPk(req.params.id)
      .then((vendedores) => {
        if (!vendedores) {
          return res.status(404).send({
            message: "vendedores Not Found",
          });
        }
        return vendedores
          .update({
            codigo: req.body.codigo || vendedores.codigo,
            nombre: req.body.nombre || vendedores.nombre,
            status: req.body.status || vendedores.status,
          })
          .then(() => res.status(200).send(project))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
