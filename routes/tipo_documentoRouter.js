var express = require('express');
var router = express.Router();
const tipo_documentoController = require('../controllers').tipo_documentoController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, tipo_documentoController.list);
router.get('/:id', requireAuthJWT, tipo_documentoController.getById);
router.post('/', requireAuthJWT, tipo_documentoController.add);
module.exports = router;