var express = require('express');
var router = express.Router();
const obsequioController = require('../controllers').obsequioController;
router.get('/', obsequioController.list);
router.get('/:id', obsequioController.getById);
module.exports = router;