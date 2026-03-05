const vendedor = require('../models').vendedor_model;
module.exports = {
    list(req, res) {
        return vendedor
            .findAll({})
            .then((vendedor) => res.status(200).send(vendedor))
            .catch((error) => { res.status(400).send(error); });
    },
};