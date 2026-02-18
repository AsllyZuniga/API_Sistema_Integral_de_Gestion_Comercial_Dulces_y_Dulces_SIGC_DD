const staging_ventas = require("../models").staging_ventas_model;
module.exports = {
  list(req, res) {
    return staging_ventas
      .findAll({})
      .then((staging_ventas) => res.status(200).send(staging_ventas))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return staging_ventas
      .findByPk(req.params.id)
      .then((staging_ventas) => {
        console.log(staging_ventas);
        if (!staging_ventas) {
          return res.status(404).send({
            message: "staging_ventas Not Found",
          });
        }
        return res.status(200).send(staging_ventas);
      })
      .catch((error) => res.status(400).send(error));
  },
};
