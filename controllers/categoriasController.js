const categorias = require("../models").categorias_model;
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
        title: req.body.title,
        description: req.body.description,
        state: req.body.state,
      })
      .then((categorias) => res.status(201).send(categorias))
      .catch((error) => res.status(400).send(error));
  },
};
