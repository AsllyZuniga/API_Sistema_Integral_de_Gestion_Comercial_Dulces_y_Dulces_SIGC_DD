const express = require('express');
const router = express.Router();

const db = require('../models');
const Vendedores = db.vendedores_model;

router.post('/login', async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({
        ok: false,
        message: 'El código es obligatorio'
      });
    }

    const vendedor = await Vendedores.findOne({
      where: {
        codigo: codigo,
        status: true
      }
    });

    if (!vendedor) {
      return res.status(404).json({
        ok: false,
        message: 'Código no encontrado o inactivo'
      });
    }

    return res.json({
      ok: true,
      vendedor: {
        id: vendedor.id,
        codigo: vendedor.codigo,
        nombre: vendedor.nombre
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: 'Error del servidor'
    });
  }
});

module.exports = router;