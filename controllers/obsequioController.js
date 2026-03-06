const obsequio = require('../models').obsequio_model;
module.exports = {
    list(req, res) {
        return obsequio
            .findAll({})
            .then((obsequio) => res.status(200).send(obsequio))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return obsequio
            .findByPk(req.params.id)
            .then((obsequio) => {
                console.log(obsequio);
                if (!obsequio) {
                    return res.status(404).send({
                        message: 'obsequio Not Found',
                    });
                }
                return res.status(200).send(obsequio);
            })
            .catch((error) =>
                res.status(400).send(error));
    }
};