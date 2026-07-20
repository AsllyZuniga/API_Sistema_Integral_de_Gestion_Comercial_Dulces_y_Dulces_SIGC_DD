var express = require('express');
var router = express.Router();
const proveedorController = require('../controllers').proveedorController;
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');
router.get('/', requireAuthJWT, proveedorController.list);
router.get('/:codigo/categorias', requireAuthJWT, proveedorController.getCategoriasByProveedor);
router.get('/:id', requireAuthJWT, proveedorController.getById);
router.post('/', requireAuthJWT, proveedorController.add);
module.exports = router;