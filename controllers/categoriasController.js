const db = require("../models");
const categorias = db.categorias_model;
const productos = db.productos_model;
module.exports = {
  list(req, res) {
    return categorias
      .findAll({})
      .then((categorias) => res.status(200).send(categorias))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return categorias
      .findByPk(req.params.id)
      .then((categorias) => {
        console.log(categorias);
        if (!categorias) {
          return res.status(404).send({
            message: "categorias Not Found",
          });
        }
        return res.status(200).send(categorias);
      })
      .catch((error) => res.status(400).send(error));
  },
  add(req, res) {
    return categorias
      .create({
        categoria: req.body.categoria,
        megacategoria: req.body.megacategoria,
        subcategoria: req.body.subcategoria,
        productos: req.body.productos,
      })
      .then((categorias) => res.status(201).send(categorias))
      .catch((error) => res.status(400).send(error));
  },

  update(req, res) {
    return categorias
      .findByPk(req.params.id)
      .then((categorias) => {
        if (!categorias) {
          return res.status(404).send({
            message: "Categoria not found",
          });
        }

        return categorias
          .update({
            categoria: req.body.categoria || categorias.categoria,
            megacategoria: req.body.megacategoria || categorias.megacategoria,
            subcategoria: req.body.subcategoria || categorias.subcategoria,
            productos: req.body.productos || categorias.productos,
          })
          .then(() => res.status(200).send(categorias))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
