const cuotaDiaService = require('../services/cuotaDiaService');

module.exports = {
    async list(req, res) {
        try {
            const data = await cuotaDiaService.getAll();
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getById(req, res) {
        try {
            const data = await cuotaDiaService.getById(req.params.id);
            if (!data) {
                return res.status(404).send({
                    message: 'cuotaDia Not Found'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async add(req, res) {
        try {
            const created = await cuotaDiaService.create({
                cuota_dia: req.body.cuota_dia,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin,
                id_usuario: req.body.id_usuario
            });
            return res.status(201).send(created);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async update(req, res) {
        try {
            const existing = await cuotaDiaService.getById(req.params.id);
            if (!existing) {
                return res.status(404).send({
                    message: 'cuotaDia Not Found'
                });
            }

            const updated = await cuotaDiaService.updateById(req.params.id, {
                cuota_dia: req.body.cuota_dia ?? existing.cuota_dia,
                fecha_inicio: req.body.fecha_inicio ?? existing.fecha_inicio,
                fecha_fin: req.body.fecha_fin ?? existing.fecha_fin,
                id_usuario: req.body.id_usuario ?? existing.id_usuario
            });

            return res.status(200).send(updated);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};

