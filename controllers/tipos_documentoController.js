const tipos_documento = require("../models").tipos_documento_model;
module.exports = {
  list(req, res) {
    return tipos_documento
      .findAll({})
      .then((tipos_documento) => res.status(200).send(tipos_documento))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
};
