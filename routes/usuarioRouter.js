var express = require('express');
var router = express.Router();
const usuarioController = require('../controllers').usuarioController;
router.get('/', usuarioController.list);
router.get('/:id', usuarioController.getById);
router.post('/', usuarioController.add);
module.exports = router;