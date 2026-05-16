var express = require('express');
var router = express.Router();
const ciudadController = require('../controllers').ciudadController;
router.get('/', ciudadController.list);
router.get('/:id', ciudadController.getById);
router.post('/', ciudadController.add);
module.exports = router;