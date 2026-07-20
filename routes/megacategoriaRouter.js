var express = require('express');
var router = express.Router();
const megacategoriaController = require('../controllers').megacategoriaController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, megacategoriaController.list);
router.get('/:id', requireAuthJWT, megacategoriaController.getById);
router.post('/', requireAuthJWT, megacategoriaController.add);
module.exports = router;