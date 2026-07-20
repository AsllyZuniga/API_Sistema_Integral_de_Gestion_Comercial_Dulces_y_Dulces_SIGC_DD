var express = require('express');
var router = express.Router();
const obsequioController = require('../controllers').obsequioController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, obsequioController.list);
router.get('/:id', requireAuthJWT, obsequioController.getById);
router.post('/', requireAuthJWT, obsequioController.add);
module.exports = router;