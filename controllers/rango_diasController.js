const rangoDiasService = require('../services/rango_diasService');

module.exports = {
    async list(req, res) {
        try {
            const data = await rangoDiasService.getAll();
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getById(req, res) {
        try {
            const data = await rangoDiasService.getById(req.params.id);
            if (!data) {
                return res.status(404).send({
                    message: 'rango_dias Not Found'
                });
            }
            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async add(req, res) {
        try {
            const created = await rangoDiasService.create({
                dias_corridos: req.body.dias_corridos,
                dias_habiles: req.body.dias_habiles,
                fecha_inicio: req.body.fecha_inicio,
                fecha_fin: req.body.fecha_fin
            });
            return res.status(201).send(created);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async update(req, res) {
        try {
            const existing = await rangoDiasService.getById(req.params.id);
            if (!existing) {
                return res.status(404).send({
                    message: 'rango_dias Not Found'
                });
            }

            const updated = await rangoDiasService.updateById(req.params.id, {
                dias_corridos: req.body.dias_corridos ?? existing.dias_corridos,
                dias_habiles: req.body.dias_habiles ?? existing.dias_habiles,
                fecha_inicio: req.body.fecha_inicio ?? existing.fecha_inicio,
                fecha_fin: req.body.fecha_fin ?? existing.fecha_fin
            });

            return res.status(200).send(updated);
        } catch (error) {
            return res.status(400).send(error);
        }
    }
};
