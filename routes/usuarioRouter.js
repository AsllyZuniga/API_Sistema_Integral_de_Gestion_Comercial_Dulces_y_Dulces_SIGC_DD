var express = require('express');
var router = express.Router();
const usuarioController = require('../controllers').usuarioController;
router.get('/', usuarioController.list);
router.get('/supervisores', usuarioController.listSupervisores);
router.get('/:id', usuarioController.getById);
router.post('/', usuarioController.add);
router.put('/:id', usuarioController.update);
module.exports = router;