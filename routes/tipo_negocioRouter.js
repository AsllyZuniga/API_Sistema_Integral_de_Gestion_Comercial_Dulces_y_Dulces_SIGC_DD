var express = require('express');
var router = express.Router();
const tipo_negocioController = require('../controllers').tipo_negocioController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, tipo_negocioController.list);
router.get('/:id', requireAuthJWT, tipo_negocioController.getById);
router.post('/', requireAuthJWT, tipo_negocioController.add);
module.exports = router;