var express = require('express');
var router = express.Router();
const tipo_negocioController = require('../controllers').tipo_negocioController;
router.get('/', tipo_negocioController.list);
router.get('/:id', tipo_negocioController.getById);
router.post('/', tipo_negocioController.add);
module.exports = router;