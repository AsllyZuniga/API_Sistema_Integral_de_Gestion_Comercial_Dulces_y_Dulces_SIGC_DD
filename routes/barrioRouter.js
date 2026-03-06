var express = require('express');
var router = express.Router();
const barrioController = require('../controllers').barrioController;
router.get('/', barrioController.list);
router.get('/:id', barrioController.getById);
router.post('/', barrioController.add);
module.exports = router;