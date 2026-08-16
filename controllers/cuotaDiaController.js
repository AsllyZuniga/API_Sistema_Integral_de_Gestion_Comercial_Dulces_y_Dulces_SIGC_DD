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
            const updateData = {};
            if (req.body.cuota_dia !== undefined) updateData.cuota_dia = req.body.cuota_dia;
            if (req.body.fecha_inicio !== undefined) updateData.fecha_inicio = req.body.fecha_inicio;
            if (req.body.fecha_fin !== undefined) updateData.fecha_fin = req.body.fecha_fin;

            const updated = await cuotaDiaService.updateById(req.params.id, updateData);

            return res.status(200).send({
                success: true,
                data: updated,
                message: 'Cuota diaria actualizada correctamente'
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
            const deleted = await cuotaDiaService.deleteById(req.params.id);
            if (!deleted) {
                return res.status(404).send({
                    message: 'cuotaDia Not Found'
                });
            }
            return res.status(200).send(deleted);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};

