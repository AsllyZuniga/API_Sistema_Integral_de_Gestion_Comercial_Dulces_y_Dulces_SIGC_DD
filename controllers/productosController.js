const productos = require("../models").productos_model;
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
        title: req.body.title,
        description: req.body.description,
        state: req.body.state,
      })
      .then((productos) => res.status(201).send(productos))
      .catch((error) => res.status(400).send(error));
  },
};
