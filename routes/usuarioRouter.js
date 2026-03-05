var express = require('express');
var router = express.Router();
const usuarioController = require('../controllers').usuarioController;
router.get('/', usuarioController.list);
module.exports = router;