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
  getById(req, res) {
    console.log(req.params.id);
    return unidades_medida
      .findByPk(req.params.id)
      .then((unidades_medida) => {
        console.log(unidades_medida);
        if (!unidades_medida) {
          return res.status(404).send({
            message: "unidades_medida Not Found",
          });
        }
        return res.status(200).send(unidades_medida);
      })
      .catch((error) => res.status(400).send(error));
  },
};
