var express = require('express');
var router = express.Router();
const proveedorController = require('../controllers').proveedorController;
router.get('/', proveedorController.list);
module.exports = router;