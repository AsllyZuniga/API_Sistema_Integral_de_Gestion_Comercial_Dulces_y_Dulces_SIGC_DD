var express = require('express');
var router = express.Router();
const ventasController = require('../controllers').ventasController;
router.get('/', ventasController.list);
module.exports = router;