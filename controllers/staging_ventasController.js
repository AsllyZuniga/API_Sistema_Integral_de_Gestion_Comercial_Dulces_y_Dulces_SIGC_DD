const staging_ventas = require('../models').staging_ventas_model;
module.exports = {
 list(req, res) {
 return staging_ventas
 .findAll({})
 .then((staging_ventas) => res.status(200).send(staging_ventas))
 .catch((error) => { res.status(400).send(error); });
 },
}