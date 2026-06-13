var express = require('express');
var router = express.Router();
const ventaController = require('../controllers').ventaController;
router.get('/', ventaController.list);
router.get('/:id', ventaController.getById);
router.post('/', ventaController.add);
module.exports = router;