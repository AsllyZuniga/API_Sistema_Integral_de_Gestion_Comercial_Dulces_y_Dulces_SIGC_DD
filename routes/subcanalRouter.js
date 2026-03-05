var express = require('express');
var router = express.Router();
const subcanalController = require('../controllers').subcanalController;
router.get('/', subcanalController.list);
module.exports = router;