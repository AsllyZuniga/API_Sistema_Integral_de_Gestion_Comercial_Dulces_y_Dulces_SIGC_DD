var express = require('express');
var router = express.Router();
const subcanalController = require('../controllers').subcanalController;
router.get('/', subcanalController.list);
router.get('/:id', subcanalController.getById);
module.exports = router;