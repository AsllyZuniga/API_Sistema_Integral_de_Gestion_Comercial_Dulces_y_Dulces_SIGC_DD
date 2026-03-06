var express = require('express');
var router = express.Router();
const itemController = require('../controllers').itemController;
router.get('/', itemController.list);
router.get('/:id', itemController.getById);
module.exports = router;