var express = require('express');
var router = express.Router();
const subcategoriaController = require('../controllers').subcategoriaController;
router.get('/', subcategoriaController.list);
router.get('/:id', subcategoriaController.getById);
module.exports = router;