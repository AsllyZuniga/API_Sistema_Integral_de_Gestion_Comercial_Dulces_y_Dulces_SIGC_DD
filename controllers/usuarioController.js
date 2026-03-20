const { 
    usuario_model, 
    rol_model
} = require('../models');
module.exports = {
        // Devuelve solo los usuarios con rol de supervisor
        listSupervisores(req, res) {
            // Puedes cambiar el nombre del rol si es diferente
            rol_model.findOne({ where: { id_rol: '2' } })
                .then(rol => {
                    if (!rol) {
                        return res.status(404).send({ message: 'Rol SUPERVISOR no encontrado' });
                    }
                    return usuario_model.findAll({ where: { id_rol: rol.id_rol } });
                })
                .then(supervisores => res.status(200).send(supervisores))
                .catch(error => res.status(400).send(error));
        },
    list(req, res) {
        return usuario_model
            .findAll({})
            .then((usuario) => res.status(200).send(usuario))
            .catch((error) => { res.status(400).send(error); });
    },
    getById(req, res) {

        console.log(req.params.id);
        return usuario_model
            .findByPk(req.params.id)
            .then((usuario) => {
                console.log(usuario);
                if (!usuario) {
                    return res.status(404).send({
                        message: 'usuario Not Found',
                    });
                }
                return res.status(200).send(usuario);
            })
            .catch((error) =>
                res.status(400).send(error));
    },
    add(req, res) {
        return usuario_model
            .create({
                username: req.body.username,
                password: req.body.password,
                estado: req.body.estado,
                id_rol: req.body.id_rol,
            })
            .then((usuario) => res.status(201).send(usuario))
            .catch((error) => res.status(400).send(error));
    },
    update(req, res) {
        return usuario_model
            .findByPk(req.params.id)
            .then(usuario => {
                if (!usuario) {
                    return res.status(404).send({
                        message: 'usuario Not Found',
                    });
                }
                return usuario
                    .update({
                        username: req.body.username || usuario.username,
                        password: req.body.password || usuario.password,
                        estado: req.body.estado || usuario.estado,
                        id_rol: req.body.id_rol || usuario.id_rol,
                    })
                    .then(() => res.status(200).send(usuario))
                    .catch((error) => res.status(400).send(error));
            })
            .catch((error) => res.status(400).send(error));
    }
};