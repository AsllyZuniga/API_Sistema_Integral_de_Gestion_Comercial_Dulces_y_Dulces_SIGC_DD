const db = require("../models");
const productos = db.productos_model;
const categorias = db.categorias_model;
module.exports = {
  list(req, res) {
    return productos
      .findAll({})
      .then((productos) => res.status(200).send(productos))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return productos
      .findByPk(req.params.id)
      .then((productos) => {
        console.log(productos);
        if (!productos) {
          return res.status(404).send({
            message: "productos Not Found",
          });
        }
        return res.status(200).send(productos);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return productos
      .create({
        codigo: req.body.codigo,
        descripcion: req.body.descripcion,
        categoria_id: req.body.categoria_id,
      })
      .then((producto) => res.status(201).send(producto))
      .catch((error) => res.status(400).send(error));
  },

  update(req, res) {
    return productos
      .findByPk(req.params.id)
      .then((producto) => {
        if (!producto) {
          return res.status(404).send({
            message: "Producto not found",
          });
        }

        return producto
          .update({
            codigo: req.body.codigo ?? producto.codigo,
            descripcion: req.body.descripcion ?? producto.descripcion,
            categoria_id: req.body.categoria_id ?? producto.categoria_id,
          })
          .then(() => res.status(200).send(producto))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
