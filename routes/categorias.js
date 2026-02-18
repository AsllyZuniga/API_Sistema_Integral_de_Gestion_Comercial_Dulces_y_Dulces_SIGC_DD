var express = require("express");
var router = express.Router();
const categoriasController = require("../controllers").categoriasController;
router.get("/", categoriasController.list);
router.get("/:id", categoriasController.getById);
router.post('/', categoriasController.add);

module.exports = router;
