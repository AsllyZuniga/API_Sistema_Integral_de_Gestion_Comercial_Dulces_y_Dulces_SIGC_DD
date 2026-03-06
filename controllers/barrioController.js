const barrio = require('../models').barrio_model;
module.exports = {
    list(req, res) {
        return barrio
            .findAll({})
            .then((barrio) => res.status(200).send(barrio))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return barrio
            .findByPk(req.params.id)
            .then((barrio) => {
                console.log(barrio);
                if (!barrio) {
                    return res.status(404).send({
                        message: 'barrio Not Found',
                    });
                }
                return res.status(200).send(barrio);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    

};