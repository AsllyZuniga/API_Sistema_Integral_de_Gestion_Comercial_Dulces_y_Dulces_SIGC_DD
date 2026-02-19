var express = require('express');
var router = express.Router();
const unidades_medidaController = require('../controllers').unidades_medidaController;
router.get('/', unidades_medidaController.list);
router.get('/:id', unidades_medidaController.getById);
router.post('/', unidades_medidaController.add);
router.put('/:id', unidades_medidaController.update);
module.exports = router;