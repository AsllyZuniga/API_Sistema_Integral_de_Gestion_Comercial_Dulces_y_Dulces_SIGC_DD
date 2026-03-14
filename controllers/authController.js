const authService = require('../services/authService');

module.exports = {
    async login(req, res) {
        try {
            const result = await authService.login({
                codigo: req.body.codigo,
                username: req.body.username,
                password: req.body.password
            });

            if (!result.success) {
                return res.status(result.status).send({
                    message: result.message
                });
            }

            return res.status(result.status).send(result.data);
        } catch (error) {
            return res.status(500).send({
                message: 'Error interno autenticando usuario',
                error: error.message
            });
        }
    },

    async register(req, res) {
        try {
            const result = await authService.register({
                codigo: req.body.codigo,
                username: req.body.username,
                password: req.body.password,
                id_rol: req.body.id_rol,
                estado: req.body.estado
            });

            if (!result.success) {
                return res.status(result.status).send({
                    message: result.message
                });
            }

            return res.status(result.status).send(result.data);
        } catch (error) {
            return res.status(500).send({
                message: 'Error interno registrando usuario',
                error: error.message
            });
        }
    },

    async registerBulk(req, res) {
        try {
            const result = await authService.registerBulk(req.body);

            if (!result.success) {
                return res.status(result.status).send({
                    message: result.message
                });
            }

            return res.status(result.status).send(result.data);
        } catch (error) {
            return res.status(500).send({
                message: 'Error interno en registro masivo',
                error: error.message
            });
        }
    }
};
