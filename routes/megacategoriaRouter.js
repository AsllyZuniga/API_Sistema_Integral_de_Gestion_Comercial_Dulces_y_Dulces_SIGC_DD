var express = require('express');
var router = express.Router();
const megacategoriaController = require('../controllers').megacategoriaController;
router.get('/', megacategoriaController.list);
module.exports = router;