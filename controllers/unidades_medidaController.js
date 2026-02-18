const unidades_medida = require("../models").unidades_medida_model;
module.exports = {
  list(req, res) {
    return unidades_medida
      .findAll({})
      .then((unidades_medida) => res.status(200).send(unidades_medida))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
};
