#!/usr/bin/env node
/**
 * Script de diagnóstico: Cuotas por Proveedor (Línea)
 * Verifica por qué el endpoint /lineas muestra algunos proveedores en 0
 */

const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function diagnoseLineasProblem() {
    console.log('\n=== DIAGNÓSTICO: CUOTAS POR PROVEEDOR (LÍNEA) ===\n');

    try {
        // 1. Obtener todos los proveedores con cuota
        console.log('1️⃣  PROVEEDORES CON CUOTA (vendedorCuotaProveedor):');
        const cuotasProveedor = await sequelize.query(`
            SELECT 
                vcp.id_proveedor,
                pr.codigo AS cod_proveedor,
                pr.nombre AS nombre_proveedor,
                COUNT(*) AS total_cuotas,
                SUM(cp.cuota) AS suma_cuotas
            FROM "vendedorCuotaProveedor" vcp
            JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
            LEFT JOIN proveedor pr ON pr.id_proveedor = vcp.id_proveedor
            WHERE vcp.estado = true
            GROUP BY vcp.id_proveedor, pr.codigo, pr.nombre
            ORDER BY suma_cuotas DESC
            LIMIT 40
        `, { type: QueryTypes.SELECT });

        console.table(cuotasProveedor);

        // 2. Obtener proveedores de las ventas (reporte_prov_con_obs)
        console.log('\n2️⃣  PROVEEDORES EN VENTAS (detalle_venta.reporte_prov_con_obs):');
        const proveedoresVentas = await sequelize.query(`
            SELECT 
                DISTINCT TRIM(dv.reporte_prov_con_obs) AS reporte_prov_con_obs,
                COALESCE(pr.id_proveedor, -1) AS id_proveedor_match,
                COALESCE(pr.nombre, 'NO ENCONTRADO') AS nombre_proveedor_match,
                COUNT(*) AS total_registros,
                SUM(dv.subtotal) AS suma_ventas
            FROM detalle_venta dv
            LEFT JOIN proveedor pr ON TRIM(LOWER(pr.nombre)) = TRIM(LOWER(dv.reporte_prov_con_obs))
            WHERE dv.reporte_prov_con_obs IS NOT NULL 
              AND TRIM(dv.reporte_prov_con_obs) != ''
            GROUP BY TRIM(dv.reporte_prov_con_obs), pr.id_proveedor, pr.nombre
            ORDER BY suma_ventas DESC
            LIMIT 40
        `, { type: QueryTypes.SELECT });

        console.table(proveedoresVentas);

        // 3. Comparar: Cuotas vs Ventas
        console.log('\n3️⃣  MATCHING CUOTAS ↔ VENTAS:');
        const matching = await sequelize.query(`
            WITH cuotas_agg AS (
                SELECT 
                    pr.id_proveedor,
                    TRIM(UPPER(pr.nombre)) AS nombre_norm,
                    SUM(cp.cuota) AS suma_cuota
                FROM "vendedorCuotaProveedor" vcp
                JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
                LEFT JOIN proveedor pr ON pr.id_proveedor = vcp.id_proveedor
                WHERE vcp.estado = true
                GROUP BY pr.id_proveedor, TRIM(UPPER(pr.nombre))
            ),
            ventas_agg AS (
                SELECT 
                    TRIM(UPPER(dv.reporte_prov_con_obs)) AS nombre_norm,
                    SUM(dv.subtotal) AS suma_venta
                FROM detalle_venta dv
                WHERE dv.reporte_prov_con_obs IS NOT NULL 
                  AND TRIM(dv.reporte_prov_con_obs) != ''
                GROUP BY TRIM(UPPER(dv.reporte_prov_con_obs))
            )
            SELECT 
                COALESCE(c.nombre_norm, v.nombre_norm) AS linea,
                c.suma_cuota,
                v.suma_venta,
                CASE 
                    WHEN c.suma_cuota > 0 AND v.suma_venta > 0 THEN '✅ CON CUOTA Y VENTA'
                    WHEN c.suma_cuota > 0 AND v.suma_venta IS NULL THEN '❌ CUOTA SIN VENTA'
                    WHEN v.suma_venta > 0 AND c.suma_cuota IS NULL THEN '⚠️  VENTA SIN CUOTA'
                    ELSE '❓ DESCONOCIDO'
                END AS estado
            FROM cuotas_agg c
            FULL OUTER JOIN ventas_agg v ON c.nombre_norm = v.nombre_norm
            ORDER BY COALESCE(c.suma_cuota, 0) DESC, COALESCE(v.suma_venta, 0) DESC
        `, { type: QueryTypes.SELECT });

        console.table(matching);

        // 4. Verificar la query del endpoint
        console.log('\n4️⃣  RESULTADO DEL ENDPOINT /lineas (SIMULADO):');
        const endpointResult = await sequelize.query(`
            WITH ventas_por_linea AS (
                SELECT
                    COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS codigo_linea,
                    COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS nombre_linea,
                    COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA')) AS reporte_prov_con_obs,
                    MAX(pr.id_proveedor) AS id_proveedor,
                    SUM(dv.subtotal) AS venta_total
                FROM venta v
                JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
                JOIN detalle_venta dv ON dv.id_venta = v.id_venta
                JOIN item it ON it.id_item = dv.id_item
                LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
                GROUP BY COALESCE(TRIM(dv.reporte_prov_con_obs), COALESCE(TRIM(pr.nombre), 'SIN LINEA'))
            )
            SELECT
                vpl.id_proveedor,
                vpl.codigo_linea,
                vpl.nombre_linea,
                (SELECT COALESCE(SUM(cp.cuota), 0)
                 FROM "vendedorCuotaProveedor" vcp
                 JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
                 WHERE vcp.id_proveedor = vpl.id_proveedor
                   AND vcp.estado = true
                ) AS cuota_proveedor_total,
                vpl.venta_total AS venta
            FROM ventas_por_linea vpl
            ORDER BY vpl.venta_total DESC
            LIMIT 40
        `, { type: QueryTypes.SELECT });

        console.table(endpointResult);

        // 5. Identificar proveedores con cuota = 0
        console.log('\n5️⃣  PROVEEDORES CON CUOTA EN CERO (PROBLEMA):');
        const problemProvidersFromEndpoint = endpointResult.filter(row => row.cuota_proveedor_total === 0 && row.venta > 0);
        console.table(problemProvidersFromEndpoint);

        console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');

    } catch (error) {
        console.error('❌ Error durante diagnóstico:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

diagnoseLineasProblem();
