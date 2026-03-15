const vendedorService = require('../services/vendedorService');

module.exports = {
    async list(req, res) {
        try {
            const data = await vendedorService.getAll();
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getById(req, res) {
        try {
            const data = await vendedorService.getById(req.params.id);
            if (!data) {
                return res.status(404).send({
                    message: 'vendedor Not Found'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async add(req, res) {
        try {
            const created = await vendedorService.create({
                codigo_vendedor: req.body.codigo_vendedor,
                nombre: req.body.nombre,
                id_usuario: req.body.id_usuario,
                id_cuotaMes: req.body.id_cuotaMes,
                id_cuotaSemana: req.body.id_cuotaSemana,
                id_cuotaDia: req.body.id_cuotaDia
            });
            return res.status(201).send(created);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async update(req, res) {
        try {
            const existing = await vendedorService.getById(req.params.id);
            if (!existing) {
                return res.status(404).send({
                    message: 'vendedor Not Found'
                });
            }

            const updated = await vendedorService.updateById(req.params.id, {
                codigo_vendedor: req.body.codigo_vendedor ?? existing.codigo_vendedor,
                nombre: req.body.nombre ?? existing.nombre,
                id_usuario: req.body.id_usuario ?? existing.id_usuario,
                id_cuotaMes: req.body.id_cuotaMes ?? existing.id_cuotaMes,
                id_cuotaSemana: req.body.id_cuotaSemana ?? existing.id_cuotaSemana,
                id_cuotaDia: req.body.id_cuotaDia ?? existing.id_cuotaDia
            });

            return res.status(200).send(updated);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async assignSupervisor(req, res) {
        try {
            const resultado = await vendedorService.assignSupervisor(
                req.params.id,
                req.body.id_supervisor
            );

            if (resultado?.error === 'VENDEDOR_NOT_FOUND') {
                return res.status(404).send({ message: 'vendedor Not Found' });
            }

            if (resultado?.error === 'SUPERVISOR_NOT_FOUND') {
                return res.status(404).send({ message: 'supervisor Not Found' });
            }

            if (resultado?.error === 'USUARIO_NOT_SUPERVISOR') {
                return res.status(400).send({ message: 'El usuario indicado no tiene rol de supervisor' });
            }

            return res.status(200).send(resultado.data);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};