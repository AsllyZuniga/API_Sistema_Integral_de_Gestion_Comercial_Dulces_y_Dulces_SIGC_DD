const clientes = require('../models').clientes_model;
module.exports = {
 list(req, res) {
 return clientes
 .findAll({})
 .then((clientes) => res.status(200).send(clientes))
 .catch((error) => { res.status(400).send(error); });
 },
}