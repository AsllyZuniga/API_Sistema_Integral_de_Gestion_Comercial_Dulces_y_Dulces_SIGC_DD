var express = require('express');
var router = express.Router();
const cuotaSemanaController = require('../controllers').cuotaSemanaController;

router.get('/', cuotaSemanaController.list);
router.get('/:id', cuotaSemanaController.getById);
router.post('/', cuotaSemanaController.add);
router.put('/:id', cuotaSemanaController.update);

module.exports = router;

