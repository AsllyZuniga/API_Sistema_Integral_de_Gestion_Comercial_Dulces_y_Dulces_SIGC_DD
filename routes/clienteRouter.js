var express = require('express');
var router = express.Router();
const clienteController = require('../controllers').clienteController;
router.get('/', clienteController.list);
router.get('/:id', clienteController.getById);
module.exports = router;