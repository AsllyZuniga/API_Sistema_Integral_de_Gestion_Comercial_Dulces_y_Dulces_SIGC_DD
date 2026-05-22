var express = require('express');
var router = express.Router();
const megacategoriaController = require('../controllers').megacategoriaController;
router.get('/', megacategoriaController.list);
router.get('/:id', megacategoriaController.getById);
router.post('/', megacategoriaController.add);
module.exports = router;