var express = require('express');
var router = express.Router();
const ventas_detalleController = require('../controllers').ventas_detalleController;
router.get('/', ventas_detalleController.list);
router.get('/:id', ventas_detalleController.getById);
router.post('/', ventas_detalleController.add);
router.put('/:id', ventas_detalleController.update);
module.exports = router;