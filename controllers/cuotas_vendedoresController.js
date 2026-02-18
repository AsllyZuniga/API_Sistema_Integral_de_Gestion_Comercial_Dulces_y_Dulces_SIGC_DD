const cuotas_vendedores = require("../models").cuotas_vendedores_model;
module.exports = {
  list(req, res) {
    return cuotas_vendedores
      .findAll({})
      .then((cuotas_vendedores) => res.status(200).send(cuotas_vendedores))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return cuotas_vendedores
      .findByPk(req.params.id)
      .then((cuotas_vendedores) => {
        console.log(cuotas_vendedores);
        if (!cuotas_vendedores) {
          return res.status(404).send({
            message: "cuotas_vendedores Not Found",
          });
        }
        return res.status(200).send(cuotas_vendedores);
      })
      .catch((error) => res.status(400).send(error));
  },
};
