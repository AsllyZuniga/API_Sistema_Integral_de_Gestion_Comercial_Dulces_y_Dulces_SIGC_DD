const authService = require('../services/authService');

/**
 * POST /api/auth/login
 *
 * Body: { codigo?, username, password }
 *   - Vendedores: envían codigo + username + password
 *   - Admin/supervisor sin vendedor: solo username + password
 *
 * Respuesta 200: { message, vendedor, token, tokenType, expiresIn }
 * Respuestas de error: 400 (input incompleto), 401 (credenciales),
 *   403 (usuario inactivo), 500 (error interno).
 */
module.exports = {
    /**
     * POST /api/auth/login — autentica y devuelve JWT.
     */
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

    /**
     * POST /api/auth/register — registra un único usuario.
     */
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

    /**
     * POST /api/auth/register-bulk — registro masivo de usuarios.
     * Body: array de usuarios, o { usuarios: [...] }.
     */
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
