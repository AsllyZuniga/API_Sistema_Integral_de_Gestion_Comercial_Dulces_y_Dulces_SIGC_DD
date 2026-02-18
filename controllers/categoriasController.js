const categorias = require('../models').categorias_model;
module.exports = {
 list(req, res) {
 return categorias
 .findAll({})
 .then((categorias) => res.status(200).send(categorias))
 .catch((error) => { res.status(400).send(error); });
 },
}