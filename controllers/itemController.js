const item = require('../models').item_model;
module.exports = {
    list(req, res) {
        return item
            .findAll({})
            .then((item) => res.status(200).send(item))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return item
            .findByPk(req.params.id)
            .then((item) => {
                console.log(item);
                if (!item) {
                    return res.status(404).send({
                        message: 'item Not Found',
                    });
                }
                return res.status(200).send(item);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};