var express = require('express');
var router = express.Router();
const canalController = require('../controllers').canalController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, canalController.list);
router.get('/:id', requireAuthJWT, canalController.getById);
router.post('/', requireAuthJWT, canalController.add);
module.exports = router;