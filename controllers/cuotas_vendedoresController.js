const cuotas_vendedores = require('../models').cuotas_vendedores_model;
module.exports = {
 list(req, res) {
 return cuotas_vendedores
 .findAll({})
 .then((cuotas_vendedores) => res.status(200).send(cuotas_vendedores))
 .catch((error) => { res.status(400).send(error); });
 },
}