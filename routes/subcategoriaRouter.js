var express = require('express');
var router = express.Router();
const subcategoriaController = require('../controllers').subcategoriaController;
router.get('/', subcategoriaController.list);
module.exports = router;