var express = require('express');
var router = express.Router();
const canalController = require('../controllers').canalController;
router.get('/', canalController.list);
router.get('/:id', canalController.getById);
router.post('/', canalController.add);
module.exports = router;