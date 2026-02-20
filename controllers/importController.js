const fs = require("fs");
const db = require("../models");
const { importVentasFromTxtFile } = require("../services/importVentasFromTxt");

module.exports = {
  async importVentasTxt(req, res) {
    if (!req.file?.path) {
      return res
        .status(400)
        .json({ message: "Envía el archivo en form-data con key 'file'." });
    }

    try {
      const result = await importVentasFromTxtFile(db, req.file.path, {
        batchSize: 1500,
        encoding: "utf8",
      });

      return res.status(200).json({
        message: "Importación completada (sin staging).",
        ...result,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Error importando el archivo",
        error: err?.message ?? String(err),
      });
    } finally {
      // borrar el archivo subido del disco
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  },
};
