var express = require('express');
var router = express.Router();
const rangoDiasController = require('../controllers').rango_diasController;

router.get('/', rangoDiasController.list);
router.get('/:id', rangoDiasController.getById);
router.post('/', rangoDiasController.add);
router.put('/:id', rangoDiasController.update);

module.exports = router;
