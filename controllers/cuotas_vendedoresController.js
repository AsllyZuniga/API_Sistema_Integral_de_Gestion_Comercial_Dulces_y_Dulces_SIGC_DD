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
  add(req, res) {
    return cuotas_vendedores
      .create({
        vendedor_id: req.body.vendedor_id,
        anio: req.body.anio,
        mes: req.body.mes,
        cuota: req.body.cuota,
      })
      .then((cuotaVend) => res.status(201).send(cuotaVend))
      .catch((error) => res.status(400).send(error));
  },

  update(req, res) {
    return cuotas_vendedores
      .findByPk(req.params.id)
      .then((cuotaVend) => {
        if (!cuotaVend) {
          return res.status(404).send({
            message: "Cuota vendedor not found",
          });
        }

        return cuotaVend
          .update({
            vendedor_id: req.body.vendedor_id ?? cuotaVend.vendedor_id,
            anio: req.body.anio ?? cuotaVend.anio,
            mes: req.body.mes ?? cuotaVend.mes,
            cuota: req.body.cuota ?? cuotaVend.cuota,
          })
          .then(() => res.status(200).send(cuotaVend))
          .catch((error) => res.status(400).send(error));
      })
      .catch((error) => res.status(400).send(error));
  },
};
