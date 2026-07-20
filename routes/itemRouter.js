var express = require('express');
var router = express.Router();
const itemController = require('../controllers').itemController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, itemController.list);
router.get('/:id', requireAuthJWT, itemController.getById);
router.post('/', requireAuthJWT, itemController.add);
module.exports = router;