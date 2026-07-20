var express = require('express');
var router = express.Router();
const usuarioController = require('../controllers').usuarioController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
const { requireAccesoGestionUsuarios } = require('../middlewares/requireAccesoGestionUsuarios');

router.get('/', requireAuthJWT, usuarioController.list);
router.get('/supervisores', requireAuthJWT, usuarioController.listSupervisores);
router.get('/:id', requireAuthJWT, usuarioController.getById);
router.post('/', requireAccesoGestionUsuarios, usuarioController.add);
router.put('/:id', requireAccesoGestionUsuarios, usuarioController.update);
module.exports = router;