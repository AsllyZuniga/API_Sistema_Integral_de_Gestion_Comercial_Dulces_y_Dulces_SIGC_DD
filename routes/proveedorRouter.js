var express = require('express');
var router = express.Router();
const proveedorController = require('../controllers').proveedorController;
router.get('/', proveedorController.list);
router.get('/:codigo/categorias', proveedorController.getCategoriasByProveedor);
router.get('/:id', proveedorController.getById);
router.post('/', proveedorController.add);
module.exports = router;