var express = require('express');
var router = express.Router();
const cuotaMesController = require('../controllers').cuotaMesController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAdminCuotas } = require('../middlewares/requireAdminCuotas');

router.get('/', requireAuthJWT, cuotaMesController.list);
router.get('/:id', requireAuthJWT, cuotaMesController.getById);
router.post('/', requireAuthJWT, cuotaMesController.add);
router.put('/:id', requireAdminCuotas, cuotaMesController.update);
router.delete('/:id', requireAuthJWT, cuotaMesController.delete);

module.exports = router;

