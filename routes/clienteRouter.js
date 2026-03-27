var express = require('express');
var router = express.Router();
const clienteController = require('../controllers').clienteController;
router.get('/', clienteController.list);
router.get('/productos-por-cliente', clienteController.productosPorCliente);
router.get('/:id', clienteController.getById);
router.post('/', clienteController.add);
module.exports = router;