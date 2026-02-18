var express = require('express');
var router = express.Router();
const staging_ventasController = require('../controllers').staging_ventasController;
router.get('/', staging_ventasController.list);
module.exports = router;