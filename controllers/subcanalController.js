const subcanal = require('../models').subcanal_model;
module.exports = {
    list(req, res) {
        return subcanal
            .findAll({})
            .then((subcanal) => res.status(200).send(subcanal))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return subcanal
            .findByPk(req.params.id)
            .then((subcanal) => {
                console.log(subcanal);
                if (!subcanal) {
                    return res.status(404).send({
                        message: 'subcanal Not Found',
                    });
                }
                return res.status(200).send(subcanal);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};