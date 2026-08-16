const cuotaSemanaService = require('../services/cuotaSemanaService');

module.exports = {
    async list(req, res) {
        try {
            const data = await cuotaSemanaService.getAll();
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getById(req, res) {
        try {
            const data = await cuotaSemanaService.getById(req.params.id);
            if (!data) {
                return res.status(404).send({
                    message: 'cuotaSemana Not Found'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async add(req, res) {
        try {
            const created = await cuotaSemanaService.create({
                cuota_semana: req.body.cuota_semana,
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
            const updateData = {};
            if (req.body.cuota_semana !== undefined) updateData.cuota_semana = req.body.cuota_semana;
            if (req.body.fecha_inicio !== undefined) updateData.fecha_inicio = req.body.fecha_inicio;
            if (req.body.fecha_fin !== undefined) updateData.fecha_fin = req.body.fecha_fin;

            const updated = await cuotaSemanaService.updateById(req.params.id, updateData);

            return res.status(200).send({
                success: true,
                data: updated,
                message: 'Cuota semanal actualizada correctamente'
            });
        } catch (error) {
            const statusCode = error.statusCode || 400;
            return res.status(statusCode).send({
                success: false,
                error: error.message,
                statusCode
            });
        }
    },

    async delete(req, res) {
        try {
            const deleted = await cuotaSemanaService.deleteById(req.params.id);
            if (!deleted) {
                return res.status(404).send({
                    message: 'cuotaSemana Not Found'
                });
            }
            return res.status(200).send(deleted);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};

