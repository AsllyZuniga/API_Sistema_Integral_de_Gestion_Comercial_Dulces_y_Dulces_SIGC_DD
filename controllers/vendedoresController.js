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
};
