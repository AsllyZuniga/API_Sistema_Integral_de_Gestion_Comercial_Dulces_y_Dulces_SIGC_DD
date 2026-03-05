var express = require('express');
var router = express.Router();
const canalController = require('../controllers').canalController;
router.get('/', canalController.list);
module.exports = router;