var express = require('express');
var router = express.Router();
const ciudadController = require('../controllers').ciudadController;
router.get('/', ciudadController.list);
router.get('/:id', ciudadController.getById);
module.exports = router;