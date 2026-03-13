var express = require('express');
var router = express.Router();
const cuotaDiaController = require('../controllers').cuotaDiaController;

router.get('/', cuotaDiaController.list);
router.get('/:id', cuotaDiaController.getById);
router.post('/', cuotaDiaController.add);
router.put('/:id', cuotaDiaController.update);

module.exports = router;

