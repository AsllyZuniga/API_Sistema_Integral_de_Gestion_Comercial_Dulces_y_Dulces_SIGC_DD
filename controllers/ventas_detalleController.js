const ventas_detalle = require("../models").ventas_detalle_model;
module.exports = {
  list(req, res) {
    return ventas_detalle
      .findAll({})
      .then((ventas_detalle) => res.status(200).send(ventas_detalle))
      .catch((error) => {
        res.status(400).send(error);
      });
  },
  getById(req, res) {
    console.log(req.params.id);
    return ventas_detalle
      .findByPk(req.params.id)
      .then((ventas_detalle) => {
        console.log(ventas_detalle);
        if (!ventas_detalle) {
          return res.status(404).send({
            message: "ventas_detalle Not Found",
          });
        }
        return res.status(200).send(ventas_detalle);
      })
      .catch((error) => res.status(400).send(error));
  },
};
