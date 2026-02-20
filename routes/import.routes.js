const express = require("express");
const multer = require("multer");
const path = require("path");
const importController = require("../controllers/importController");

const router = express.Router();

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

router.post(
  "/ventas-txt",
  upload.single("file"),
  importController.importVentasTxt,
);

module.exports = router;
