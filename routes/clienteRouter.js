var express = require('express');
var router = express.Router();
const clienteController = require('../controllers').clienteController;
router.get('/', clienteController.list);
module.exports = router;