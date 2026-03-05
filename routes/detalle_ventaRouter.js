var express = require('express');
var router = express.Router();
const detalle_ventaController = require('../controllers').detalle_ventaController;
router.get('/', detalle_ventaController.list);
module.exports = router;