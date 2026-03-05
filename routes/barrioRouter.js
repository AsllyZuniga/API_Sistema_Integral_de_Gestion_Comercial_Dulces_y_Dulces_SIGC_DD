var express = require('express');
var router = express.Router();
const barrioController = require('../controllers').barrioController;
router.get('/', barrioController.list);
module.exports = router;