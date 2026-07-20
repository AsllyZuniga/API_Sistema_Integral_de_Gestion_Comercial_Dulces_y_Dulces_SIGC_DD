var express = require('express');
var router = express.Router();
const rangoDiasController = require('../controllers').rango_diasController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/mes-actual/habiles', requireAuthJWT, rangoDiasController.getCurrentMonthHabiles);
router.get('/', requireAuthJWT, rangoDiasController.list);
router.post('/sync/month', requireAuthJWT, rangoDiasController.syncMonth);
router.get('/:id', requireAuthJWT, rangoDiasController.getById);
router.post('/', requireAuthJWT, rangoDiasController.add);
router.put('/:id', requireAuthJWT, rangoDiasController.update);

module.exports = router;
