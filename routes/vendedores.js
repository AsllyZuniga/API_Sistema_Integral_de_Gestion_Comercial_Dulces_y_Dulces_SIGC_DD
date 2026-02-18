var express = require('express');
var router = express.Router();
const vendedoresController = require('../controllers').vendedoresController;
router.get('/', vendedoresController.list);
module.exports = router;