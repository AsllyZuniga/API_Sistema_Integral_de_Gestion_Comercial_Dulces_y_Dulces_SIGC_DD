var express = require('express');
var router = express.Router();
const productosController = require('../controllers').productosController;
router.get('/', productosController.list);
module.exports = router;