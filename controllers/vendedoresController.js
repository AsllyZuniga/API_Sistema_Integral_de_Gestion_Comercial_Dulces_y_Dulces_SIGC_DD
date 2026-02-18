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
};
