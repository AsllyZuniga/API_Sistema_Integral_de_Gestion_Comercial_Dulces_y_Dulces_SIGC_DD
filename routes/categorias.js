var express = require("express");
var router = express.Router();
const categoriasController = require("../controllers").categoriasController;
router.get("/", categoriasController.list);
router.get("/:id", categoriasController.getById);

module.exports = router;
