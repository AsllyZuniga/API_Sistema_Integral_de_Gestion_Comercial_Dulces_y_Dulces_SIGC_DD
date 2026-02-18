const ventas = require("../models").ventas_model;
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
};
