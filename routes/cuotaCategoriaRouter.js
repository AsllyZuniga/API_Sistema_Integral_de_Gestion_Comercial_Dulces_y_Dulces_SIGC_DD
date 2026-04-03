var express = require('express');
var router = express.Router();
const cuotaCategoriaController = require('../controllers').cuotaCategoriaController;

router.get('/general', cuotaCategoriaController.general);

module.exports = router;
