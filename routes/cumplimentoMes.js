var express = require("express");
var router = express.Router();
const cumplimientoMesController = require("../controllers").cumplimientoMesController;
router.get("/cumplimiento", cumplimientoMesController.getCumplimientoCuotaMes);
router.get("/cumplimiento/:codigo", cumplimientoMesController.getCumplimientoPorCodigo);
module.exports = router;