function cleanString(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseDateDDMMYYYY(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`; // DATEONLY
}

// "143.721,30" -> 143721.30
// "$13.531.737.420,80" -> 13531737420.80
function parseEsNumber(value) {
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (!s) return null;

  s = s.replace(/\$/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/\./g, "").replace(/,/g, ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

// FE1-00372062 -> FE1
function extractTipoCodigo(numeroDocumento) {
  if (!numeroDocumento) return null;
  const s = String(numeroDocumento).trim();
  const idx = s.indexOf("-");
  if (idx === -1) return s.toUpperCase();
  return s.slice(0, idx).toUpperCase();
}

function isTotalLine(cols) {
  const first = (cols?.[0] ?? "").toString().trim().toLowerCase();
  return first === "gran total";
}

module.exports = {
  cleanString,
  parseDateDDMMYYYY,
  parseEsNumber,
  extractTipoCodigo,
  isTotalLine,
};
