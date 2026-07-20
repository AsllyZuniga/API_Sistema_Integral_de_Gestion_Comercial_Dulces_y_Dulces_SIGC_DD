var express = require('express');
var router = express.Router();
const ventaController = require('../controllers').ventaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, ventaController.list);
router.get('/:id', requireAuthJWT, ventaController.getById);
router.post('/', requireAuthJWT, ventaController.add);
module.exports = router;