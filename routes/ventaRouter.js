var express = require('express');
var router = express.Router();
const ventaController = require('../controllers').ventaController;
router.get('/', ventaController.list);
module.exports = router;