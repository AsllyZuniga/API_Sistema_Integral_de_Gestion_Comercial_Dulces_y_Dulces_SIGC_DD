var express = require('express');
var router = express.Router();
const tipos_documentosController = require('../controllers').tipos_documentosController;
router.get('/', tipos_documentosController.list);
module.exports = router;