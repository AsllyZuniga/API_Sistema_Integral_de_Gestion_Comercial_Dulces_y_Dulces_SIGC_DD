var express = require('express');
var router = express.Router();
const cuotaSemanaController = require('../controllers').cuotaSemanaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAdminCuotas } = require('../middlewares/requireAdminCuotas');

router.get('/', requireAuthJWT, cuotaSemanaController.list);
router.get('/:id', requireAuthJWT, cuotaSemanaController.getById);
router.post('/', requireAuthJWT, cuotaSemanaController.add);
router.put('/:id', requireAdminCuotas, cuotaSemanaController.update);
router.delete('/:id', requireAuthJWT, cuotaSemanaController.delete);

module.exports = router;

