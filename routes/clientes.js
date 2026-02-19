var express = require("express");
var router = express.Router();
const clientesController = require("../controllers").clientesController;
router.get("/", clientesController.list);
router.get("/:id", clientesController.getById);
router.post('/', clientesController.add);
router.put('/:id', clientesController.update);

module.exports = router;
