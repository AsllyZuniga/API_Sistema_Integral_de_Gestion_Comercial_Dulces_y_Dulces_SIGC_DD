var express = require('express');
var router = express.Router();
const ciudadController = require('../controllers').ciudadController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, ciudadController.list);
router.get('/:id', requireAuthJWT, ciudadController.getById);
router.post('/', requireAuthJWT, ciudadController.add);
module.exports = router;