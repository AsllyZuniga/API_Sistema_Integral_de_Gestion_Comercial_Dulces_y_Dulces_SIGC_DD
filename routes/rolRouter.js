var express = require('express');
var router = express.Router();
const rolController = require('../controllers').rolController;
router.get('/', rolController.list);
router.get('/:id', rolController.getById);
router.post('/', rolController.add);
module.exports = router;