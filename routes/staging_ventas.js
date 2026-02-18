var express = require("express");
var router = express.Router();
const staging_ventasController =
  require("../controllers").staging_ventasController;
router.get("/", staging_ventasController.list);
router.get("/:id", staging_ventasController.getById);
router.post('/', staging_ventasController.add);

module.exports = router;
