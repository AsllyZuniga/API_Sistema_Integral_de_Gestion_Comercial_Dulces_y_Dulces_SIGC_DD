var express = require('express');
var router = express.Router();
const detalle_ventaController = require('../controllers').detalle_ventaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, detalle_ventaController.list);
router.get('/:id', requireAuthJWT, detalle_ventaController.getById);
router.post('/', requireAuthJWT, detalle_ventaController.add);
module.exports = router;