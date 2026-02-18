var express = require('express');
var router = express.Router();
const clientesController = require('../controllers').clientesController;
router.get('/', clientesController.list);
module.exports = router;