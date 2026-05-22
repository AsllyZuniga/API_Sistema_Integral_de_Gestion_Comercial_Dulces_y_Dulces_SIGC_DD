const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function main() {
    // Simula getCumplimientoMesFront con el fix != 0
    const rows = await sequelize.query(`
        WITH ventas_filtradas AS (
            SELECT
                v.id_vendedor,
                SUM(
                    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%'
                    THEN -ABS(COALESCE(dv.subtotal, 0))
                    ELSE COALESCE(dv.subtotal, 0)
                    END
                ) AS venta_acum
            FROM venta v
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            WHERE v.fecha >= '2026-03-01' AND v.fecha <= '2026-03-31'
            GROUP BY v.id_vendedor
        )
        SELECT
            vd.codigo_vendedor AS cod,
            vd.nombre AS vendedor,
            COALESCE(vf.venta_acum, 0) AS venta_acum
        FROM vendedor vd
        LEFT JOIN ventas_filtradas vf ON vf.id_vendedor = vd.id_vendedor
        WHERE (COALESCE(vf.venta_acum, 0) != 0)
        ORDER BY vd.nombre ASC
    `, { type: QueryTypes.SELECT });

    const total = rows.reduce((a, r) => a + parseFloat(r.venta_acum || 0), 0);
    console.log(`Vendedores incluidos: ${rows.length}`);
    console.log(`Total con fix: ${total}`);
    console.log(`Excel esperado:  8281184430`);
    console.log(`Diferencia: ${total - 8281184430}`);

    // Confirmar que 9999 aparece
    const v9999 = rows.find(r => r.cod === '9999');
    console.log('\nVendedor 9999:', v9999 ? JSON.stringify(v9999) : 'NO APARECE');

    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
