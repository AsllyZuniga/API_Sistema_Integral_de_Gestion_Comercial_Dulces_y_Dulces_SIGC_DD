var express = require('express');
var router = express.Router();
const vendedorController = require('../controllers').vendedorController;
router.get('/', vendedorController.list);
router.get('/:id', vendedorController.getById);
module.exports = router;