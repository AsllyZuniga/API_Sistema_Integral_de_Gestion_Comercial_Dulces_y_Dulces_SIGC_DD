var express = require('express');
var router = express.Router();
const categoriaController = require('../controllers').categoriaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, categoriaController.list);
router.get('/:id', requireAuthJWT, categoriaController.getById);
router.post('/', requireAuthJWT, categoriaController.add);
module.exports = router;