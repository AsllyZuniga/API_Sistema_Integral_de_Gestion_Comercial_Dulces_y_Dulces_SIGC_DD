const cuotaMesService = require('../services/cuotaMesService');

module.exports = {
    async list(req, res) {
        try {
            const data = await cuotaMesService.getAll();
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getById(req, res) {
        try {
            const data = await cuotaMesService.getById(req.params.id);
            if (!data) {
                return res.status(404).send({
                    message: 'cuotaMes Not Found'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async add(req, res) {
        try {
            const created = await cuotaMesService.create({
                cuota_mes: req.body.cuota_mes,
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
            if (req.body.cuota_mes !== undefined) updateData.cuota_mes = req.body.cuota_mes;
            if (req.body.fecha_inicio !== undefined) updateData.fecha_inicio = req.body.fecha_inicio;
            if (req.body.fecha_fin !== undefined) updateData.fecha_fin = req.body.fecha_fin;
            if (req.body.mes !== undefined) updateData.mes = req.body.mes;
            if (req.body.year !== undefined) updateData.year = req.body.year;

            const updated = await cuotaMesService.updateById(req.params.id, updateData);

            return res.status(200).send({
                success: true,
                data: updated,
                message: 'Cuota mensual actualizada correctamente'
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
            const deleted = await cuotaMesService.deleteById(req.params.id);
            if (!deleted) {
                return res.status(404).send({
                    message: 'cuotaMes Not Found'
                });
            }
            return res.status(200).send(deleted);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};

