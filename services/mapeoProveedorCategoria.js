/**
 * Servicio de Mapeo Proveedor ↔ Categoría
 * Sincroniza la relación entre tabla de proveedores y categorías
 * para mantener un único sistema de cuotas
 */

const MAPEO_PROVEEDOR_CATEGORIA = {
    // Formato: 'nombre_proveedor': 'id_categoria'
    'ARCOR': '020',
    'TONING': '220',
    'INCODEPF': '070',
    'ITALO': '130',
    'ALICORP ALIMENTOS': '110',
    'ALICORP': '110',
    'CONFITECA': '100',
    'FLORA FOOD': '273',
    'UPFIELD': '273', // Alternativa para FLORA FOOD
    'EL REY': '230',
    'LEVAPAN': '240',
    'SUPER': '030',
    'HENKEL': '640',
    'RECAMIER': '690',
    'PREBEL': '630',
    'ENERGIZER': '880',
    'COFARMA': '875',
    'LAB. COFARMA': '875',
    'SAN JORGE VELAS Y VELONES': '860',
    'SAN JORGE': '860',
    'BELLEZA EXPRESS': '625',
    'LA CORUÑA': '290',
    'LA CORU\u00d1A': '290', // Variante con encoding diferente
    'KATORI': '873',
    'SIEGFRIED': '540',
    'BAYER': '523',
    'HALEON': '525',
    'MONDELEZ': '040',
    'ALDOR': '080',
    'FONANDES': '900',
    'DANISCO': '277',
    'CALA': '806',
    'JOHNSON Y JOHNSON': '620',
    'JOHNSON': '620', // Variante corta
    'SANUSS': '805',
    'KELLOGG': '280',
    'KELLOGGS': '280',
    'MULTIDIMENSIONALES': '890',
    'LAB. OSA': '520',
    'OSA': '520',
    'FINI': '190'
};

// Crear mapeo inverso para búsquedas rápidas
const MAPEO_CATEGORIA_PROVEEDOR = {};
Object.entries(MAPEO_PROVEEDOR_CATEGORIA).forEach(([proveedor, categoria]) => {
    if (!MAPEO_CATEGORIA_PROVEEDOR[categoria]) {
        MAPEO_CATEGORIA_PROVEEDOR[categoria] = proveedor;
    }
});

/**
 * Obtiene el ID de categoría a partir del nombre del proveedor
 * @param {string} nombreProveedor - Nombre del proveedor
 * @returns {string|null} ID de categoría o null si no existe mapeo
 */
const getCategoriaIdFromProveedor = (nombreProveedor) => {
    if (!nombreProveedor) return null;
    
    const normalizado = String(nombreProveedor).trim().toUpperCase();
    
    // Búsqueda directa
    let id = Object.entries(MAPEO_PROVEEDOR_CATEGORIA).find(
        ([key]) => key.toUpperCase() === normalizado
    )?.[1];
    
    if (id) return id;
    
    // Búsqueda parcial (para variantes)
    id = Object.entries(MAPEO_PROVEEDOR_CATEGORIA).find(
        ([key]) => {
            const keyUpper = key.toUpperCase();
            return normalizado.includes(keyUpper) || keyUpper.includes(normalizado);
        }
    )?.[1];
    
    return id || null;
};

/**
 * Obtiene el nombre del proveedor a partir del ID de categoría
 * @param {string} idCategoria - ID de categoría
 * @returns {string|null} Nombre del proveedor o null
 */
const getProveedorFromCategoriaId = (idCategoria) => {
    if (!idCategoria) return null;
    return MAPEO_CATEGORIA_PROVEEDOR[String(idCategoria)] || null;
};

/**
 * Valida si existe un mapeo para un proveedor
 * @param {string} nombreProveedor - Nombre del proveedor
 * @returns {boolean}
 */
const existeMapeoPara = (nombreProveedor) => {
    return getCategoriaIdFromProveedor(nombreProveedor) !== null;
};

/**
 * Obtiene todos los mapeos (útil para debugging)
 * @returns {Object} Mapeo completo
 */
const obtenerMapeoCompleto = () => {
    return { ...MAPEO_PROVEEDOR_CATEGORIA };
};

/**
 * Obtiene el mapeo inverso (categoría → proveedor)
 * @returns {Object} Mapeo inverso
 */
const obtenerMapeoInverso = () => {
    return { ...MAPEO_CATEGORIA_PROVEEDOR };
};

module.exports = {
    MAPEO_PROVEEDOR_CATEGORIA,
    MAPEO_CATEGORIA_PROVEEDOR,
    getCategoriaIdFromProveedor,
    getProveedorFromCategoriaId,
    existeMapeoPara,
    obtenerMapeoCompleto,
    obtenerMapeoInverso
};
