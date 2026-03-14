var express = require('express');
var router = express.Router();
const cuotaMesController = require('../controllers').cuotaMesController;

router.get('/', cuotaMesController.list);
router.get('/:id', cuotaMesController.getById);
router.post('/', cuotaMesController.add);
router.put('/:id', cuotaMesController.update);

module.exports = router;

