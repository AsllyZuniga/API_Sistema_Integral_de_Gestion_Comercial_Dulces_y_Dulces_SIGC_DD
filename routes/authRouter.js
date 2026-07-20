var express = require('express');
var router = express.Router();
const authController = require('../controllers').authController;
const { requireAccesoGestionUsuarios } = require('../middlewares/requireAccesoGestionUsuarios');

router.post('/login', authController.login);
router.post('/register', requireAccesoGestionUsuarios, authController.register);
router.post('/register/bulk', requireAccesoGestionUsuarios, authController.registerBulk);

module.exports = router;
