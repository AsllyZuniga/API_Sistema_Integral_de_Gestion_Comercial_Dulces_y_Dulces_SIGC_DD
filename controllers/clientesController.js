const clientes = require("../models").clientes_model;
module.exports = {
  list(req, res) {
    return clientes
      .findAll({})
      .then((clientes) => res.status(200).send(clientes))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return clientes
      .findByPk(req.params.id)
      .then((clientes) => {
        console.log(clientes);
        if (!clientes) {
          return res.status(404).send({
            message: "clientes Not Found",
          });
        }
        return res.status(200).send(clientes);
      })
      .catch((error) => res.status(400).send(error));
  },
};
