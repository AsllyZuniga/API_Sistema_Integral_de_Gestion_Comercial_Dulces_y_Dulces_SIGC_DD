var express = require("express");
var router = express.Router();
const cuotas_vendedoresController =
  require("../controllers").cuotas_vendedoresController;
router.get("/", cuotas_vendedoresController.list);
router.get("/:id", cuotas_vendedoresController.getById);
router.post('/', cuotas_vendedoresController.add);
router.put('/:id', cuotas_vendedoresController.update);
module.exports = router;
