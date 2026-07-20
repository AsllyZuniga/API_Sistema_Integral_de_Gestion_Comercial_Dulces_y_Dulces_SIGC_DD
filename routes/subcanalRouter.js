var express = require('express');
var router = express.Router();
const subcanalController = require('../controllers').subcanalController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, subcanalController.list);
router.get('/:id', requireAuthJWT, subcanalController.getById);
router.post('/', requireAuthJWT, subcanalController.add);
module.exports = router;