var express = require('express');
var router = express.Router();
const tipo_documentoController = require('../controllers').tipo_documentoController;
router.get('/', tipo_documentoController.list);
module.exports = router;