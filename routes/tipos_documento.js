var express = require('express');
var router = express.Router();
const tipos_documentoController = require('../controllers').tipos_documentoController;
router.get('/', tipos_documentoController.list);
router.get('/:id', tipos_documentoController.getById);
router.post('/', tipos_documentoController.add);
router.put('/:id', tipos_documentoController.update);
module.exports = router;