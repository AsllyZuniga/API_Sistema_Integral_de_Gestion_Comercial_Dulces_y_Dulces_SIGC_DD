const productos = require('../models').productos_model;
module.exports = {
 list(req, res) {
 return productos
 .findAll({})
 .then((productos) => res.status(200).send(productos))
 .catch((error) => { res.status(400).send(error); });
 },
}