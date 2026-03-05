const subcanal = require('../models').subcanal_model;
module.exports = {
    list(req, res) {
        return subcanal
            .findAll({})
            .then((subcanal) => res.status(200).send(subcanal))
            .catch((error) => { res.status(400).send(error); });
    },
};