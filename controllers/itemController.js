const item = require('../models').item_model;
module.exports = {
    list(req, res) {
        return item
            .findAll({})
            .then((item) => res.status(200).send(item))
            .catch((error) => { res.status(400).send(error); });
    },
};