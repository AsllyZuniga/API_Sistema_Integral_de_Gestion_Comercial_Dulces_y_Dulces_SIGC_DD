var express = require('express');
var router = express.Router();
const cuotas_vendedoresController = require('../controllers').cuotas_vendedoresController;
router.get('/', cuotas_vendedoresController.list);
module.exports = router;