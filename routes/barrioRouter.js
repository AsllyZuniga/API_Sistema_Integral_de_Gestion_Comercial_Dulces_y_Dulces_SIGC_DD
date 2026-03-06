var express = require('express');
var router = express.Router();
const barrioController = require('../controllers').barrioController;
router.get('/', barrioController.list);
router.get('/:id', barrioController.getById);
module.exports = router;