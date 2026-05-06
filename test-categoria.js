const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function getCategoriaIdByNombre(nombreCategoria) {
    if (!nombreCategoria) return null;
    const nombre = String(nombreCategoria).trim();
    const row = await sequelize.query(
        'SELECT id_categoria FROM categoria WHERE TRIM(nombre) = :nombre LIMIT 1',
        { replacements: { nombre }, type: QueryTypes.SELECT, plain: true }
    );
    return row?.id_categoria;
}

(async () => {
  try {
    const categoriaId = await getCategoriaIdByNombre('0150 - 1000-AROMATICAS');
    console.log('Categoría ID:', categoriaId);

    if (!categoriaId) {
      console.log('ERROR: No se encontró categoría');
      await sequelize.close();
      return;
    }

    const replacements = {
      fechaInicio: new Date('2026-04-01'),
      fechaFin: new Date('2026-04-30'),
      codigoVendedor: '0550',
      proveedorExacto: '320',
      proveedorLike: '320%',
      categoria: String(categoriaId)
    };

    const query = `WITH ventas_filtradas AS (
      SELECT v.id_vendedor, 
        SUM(CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
            THEN -ABS(COALESCE(dv.subtotal, 0)) 
            ELSE COALESCE(dv.subtotal, 0) END) AS venta_acum
      FROM venta v
      JOIN detalle_venta dv ON dv.id_venta = v.id_venta
      JOIN item it ON it.id_item = dv.id_item
      LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
      WHERE v.fecha >= :fechaInicio 
        AND v.fecha <= :fechaFin
        AND (TRIM(dv.reporte_prov_con_obs) = :proveedorExacto OR TRIM(dv.reporte_prov_con_obs) LIKE :proveedorLike)
        AND CAST(it.id_categoria AS TEXT) = :categoria
      GROUP BY v.id_vendedor
    ) 
    SELECT vd.codigo_vendedor AS cod, vd.nombre AS vendedor, COALESCE(vf.venta_acum, 0) AS venta_acum
    FROM vendedor vd
    LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
    WHERE vd.codigo_vendedor = :codigoVendedor`;

    const rows = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
    console.log('✅ Resultado:', JSON.stringify(rows[0], null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
})();
