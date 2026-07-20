var express = require('express');
var router = express.Router();
const barrioController = require('../controllers').barrioController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, barrioController.list);
router.get('/:id', requireAuthJWT, barrioController.getById);
router.post('/', requireAuthJWT, barrioController.add);
module.exports = router;