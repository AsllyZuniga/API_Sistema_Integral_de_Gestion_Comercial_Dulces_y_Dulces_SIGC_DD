var express = require('express');
var router = express.Router();
const tipos_documentoController = require('../controllers').tipos_documentoController;
router.get('/', tipos_documentoController.list);
module.exports = router;