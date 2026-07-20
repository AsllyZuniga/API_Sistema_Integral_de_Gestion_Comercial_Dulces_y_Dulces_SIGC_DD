var express = require('express');
var router = express.Router();
const cuotaMesController = require('../controllers').cuotaMesController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/', requireAuthJWT, cuotaMesController.list);
router.get('/:id', requireAuthJWT, cuotaMesController.getById);
router.post('/', requireAuthJWT, cuotaMesController.add);
router.put('/:id', requireAuthJWT, cuotaMesController.update);
router.delete('/:id', requireAuthJWT, cuotaMesController.delete);

module.exports = router;

