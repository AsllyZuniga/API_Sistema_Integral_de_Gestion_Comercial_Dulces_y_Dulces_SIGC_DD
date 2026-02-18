var express = require('express');
var router = express.Router();
const unidades_medidaController = require('../controllers').unidades_medidaController;
router.get('/', unidades_medidaController.list);
module.exports = router;