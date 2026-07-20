var express = require('express');
var router = express.Router();
const subcategoriaController = require('../controllers').subcategoriaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, subcategoriaController.list);
router.get('/:id', requireAuthJWT, subcategoriaController.getById);
router.post('/', requireAuthJWT, subcategoriaController.add);
module.exports = router;