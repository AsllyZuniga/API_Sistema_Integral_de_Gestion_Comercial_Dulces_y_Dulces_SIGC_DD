/**
 * Utilidades para manejo de fechas
 */

/**
 * Calcula el rango de fechas (inicio y fin) de un mes dado
 * @param {string} mesAnio - Formato YYYY-MM (ej: "2026-03")
 * @returns {Object} { fechaInicio: "2026-03-01", fechaFin: "2026-03-31" }
 * @throws {Error} Si el formato es inválido
 */
const getMonthRange = (mesAnio) => {
  if (!mesAnio) {
    // Si no se proporciona, usar el mes actual
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    mesAnio = `${year}-${month}`;
  }

  // Validar formato YYYY-MM
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(mesAnio)) {
    throw new Error(`Formato inválido para mesAnio. Usa YYYY-MM (ej: 2026-03). Recibido: "${mesAnio}"`);
  }

  const [year, month] = mesAnio.split('-').map(Number);

  // Validar valores válidos
  if (month < 1 || month > 12) {
    throw new Error(`Mes inválido: ${month}. Debe estar entre 01 y 12`);
  }

  if (year < 1900 || year > 2100) {
    throw new Error(`Año inválido: ${year}. Debe estar entre 1900 y 2100`);
  }

  // Calcular primer día del mes
  const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01`;

  // Calcular último día del mes
  const ultimoDia = new Date(year, month, 0).getDate();
  const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  return {
    fechaInicio,
    fechaFin,
    mesAnio
  };
};

/**
 * Parsea fechas de múltiples formatos y retorna el rango del mes
 * @param {string} mesAnio - Formato YYYY-MM o YYYY-M
 * @param {string} fechaInicio - Alternativa: fecha completa inicio (fallback)
 * @param {string} fechaFin - Alternativa: fecha completa fin (fallback)
 * @returns {Object} { fechaInicio, fechaFin, mesAnio }
 */
const parseDateRange = (mesAnio, fechaInicio, fechaFin) => {
  // Si se proporcionan fechas completas, usarlas (fallback para compatibilidad)
  if (fechaInicio && fechaFin) {
    // Validar formato YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fechaInicio) || !regex.test(fechaFin)) {
      throw new Error('Formato de fecha inválido. Usa YYYY-MM-DD para fechas completas');
    }
    return {
      fechaInicio,
      fechaFin,
      mesAnio: fechaInicio.substring(0, 7) // Extraer YYYY-MM
    };
  }

  // Si se proporciona mesAnio, usarlo
  if (mesAnio) {
    return getMonthRange(mesAnio);
  }

  // Si no se proporciona nada, usar mes actual
  return getMonthRange();
};

/**
 * Formatea una fecha a string YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string} "2026-03-15"
 */
const formatDateOnly = (date) => {
  if (!date) return null;

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

module.exports = {
  getMonthRange,
  parseDateRange,
  formatDateOnly
};
