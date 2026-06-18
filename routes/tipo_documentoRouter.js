var express = require('express');
var router = express.Router();
const tipo_documentoController = require('../controllers').tipo_documentoController;
router.get('/', tipo_documentoController.list);
router.get('/:id', tipo_documentoController.getById);
router.post('/', tipo_documentoController.add);
module.exports = router;