var express = require('express');
var router = express.Router();
const categoriaController = require('../controllers').categoriaController;
router.get('/', categoriaController.list);
router.get('/:id', categoriaController.getById);
router.post('/', categoriaController.add);
module.exports = router;