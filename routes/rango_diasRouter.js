var express = require('express');
var router = express.Router();
const rangoDiasController = require('../controllers').rango_diasController;

router.get('/mes-actual/habiles', rangoDiasController.getCurrentMonthHabiles);
router.get('/', rangoDiasController.list);
router.post('/sync/month', rangoDiasController.syncMonth);
router.get('/:id', rangoDiasController.getById);
router.post('/', rangoDiasController.add);
router.put('/:id', rangoDiasController.update);

module.exports = router;
