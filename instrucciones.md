Importante: no refactorices toda la lógica de negocio. Primero detecta dónde se usa `linea` en el reporte de ventas por línea y cambia esa dimensión por `reporte_prov_con_obs`. Luego revisa el modelo de datos y propone/aplica la migración mínima necesaria para soportar dimensiones, tabla de hechos y `cliente_vendedor`, preservando la lógica actual de cuotas y cumplimiento.
Antes de aplicar cambios destructivos, crea una migración segura. Si necesitas cambiar nombres o estructura, conserva una vista de compatibilidad para que el código actual siga funcionando. No elimines columnas como `linea`; solo agrega o prioriza `reporte_prov_con_obs` para el reporte de ventas por línea.
Necesito hacer un cambio de modelo de datos y consultas sin romper la lógica actual de cálculo de cuotas/cumplimiento.

Contexto:

* El sistema ya funciona.
* La lógica de cálculo de cuotas, cumplimiento, ventas netas, negativos/devoluciones y reportes ya está correcta.
* No quiero reescribir esa lógica.
* El problema actual es que las tablas están demasiado relacionadas directamente.
* Tengo otra rama/base en Neon DB donde se puede hacer una migración y aprovechar lo existente.

Objetivo:
Modificar el modelo y las consultas para que el análisis de ventas siga funcionando, pero separando mejor datos crudos, dimensiones/maestras, tablas puente y tabla de hechos.

Reglas importantes:

1. NO eliminar negativos.
2. NO convertir negativos a positivos.
3. NO reemplazar negativos por cero.
4. Los negativos son necesarios para el cumplimiento real del vendedor.
5. Mantener la lógica actual de cálculo de cuotas y cumplimiento tal como está.
6. Mantener compatibilidad con los reportes actuales donde sea posible.
7. Hacer los cambios mediante migraciones.
8. Usar la rama/base de Neon DB disponible para probar la migración.
9. No borrar datos existentes sin respaldo o sin una migración reversible.

Cambio específico del reporte:
En el reporte de ventas por línea, donde actualmente se agrupa o filtra por la columna `linea`, debe usarse la columna:

`reporte_prov_con_obs`

o su equivalente actual en el modelo, por ejemplo:

`REPORTE PROV CON OBS`

Es decir:

* Antes: ventas por `linea`
* Ahora: ventas por `reporte_prov_con_obs`

Pero el nombre visible del reporte puede seguir siendo “ventas por línea” si ya existe así en la interfaz, salvo que sea mejor cambiarlo a “ventas por reporte proveedor con observación”.

Tareas:

1. Revisar el esquema actual de base de datos.

2. Identificar dónde se usa `linea` para:

   * agrupaciones
   * filtros
   * joins
   * reportes
   * queries SQL
   * vistas
   * endpoints
   * componentes frontend
   * cálculos de cuotas

3. Separar el cambio en dos partes:

   * modelo/migración de datos
   * actualización de consultas del reporte
   * nueva conexion postgresql://neondb_owner:npg_URpEM0DQPel7@ep-plain-recipe-ae7ukzj4-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

4. Crear o ajustar las tablas necesarias siguiendo este enfoque:

   * staging para datos crudos del TSV
   * tabla de hechos de ventas
   * dimensiones/maestras para vendedor, cliente, item, sucursal, canal, categoría, subcanal, tipo de negocio, ciudad
   * tablas puente solo donde sea necesario, especialmente cliente-vendedor

5. Si ya existe una tabla de ventas principal, no reemplazarla a ciegas. Primero analizar si conviene:

   * migrarla a `fact_ventas`
   * crear una vista compatible
   * o adaptar las consultas actuales manteniendo la tabla existente

6. Crear una migración que preserve estos campos como snapshot en la tabla de ventas:

   * codigo_vendedor
   * nombre_vendedor
   * cliente_factura
   * razon_social_cliente
   * item
   * desc_item
   * linea
   * reporte_prov_con_obs
   * canal
   * categoria
   * subcanal
   * subcanal_detallado
   * megacategoria
   * subcategoria
   * tipo_negocio
   * ciudad
   * barrio
   * fecha
   * cantidades
   * valores
   * margen
   * impuestos

7. Crear o actualizar tabla puente `cliente_vendedor`, porque un cliente puede ser atendido por varios vendedores:

   * cliente_factura
   * codigo_vendedor
   * fecha_desde
   * fecha_hasta
   * activo

   Esta tabla puede poblarse inicialmente desde ventas históricas usando combinaciones distintas de cliente y vendedor.

8. Mantener la lógica actual de cálculo de cuotas/cumplimiento.
   No cambiar fórmulas existentes salvo que dependan directamente de `linea` en el reporte de ventas por línea.

9. Para el reporte de ventas por línea:
   Cambiar la dimensión usada de `linea` a `reporte_prov_con_obs`.

   Ejemplo conceptual:

   Antes:
   SELECT
   linea,
   SUM(valor_neto) AS venta_neta
   FROM ventas
   GROUP BY linea;

   Ahora:
   SELECT
   reporte_prov_con_obs AS linea_reporte,
   SUM(valor_neto) AS venta_neta
   FROM ventas
   GROUP BY reporte_prov_con_obs;

10. Si hay filtros por línea, revisar si deben apuntar ahora a `reporte_prov_con_obs`.

11. Si hay cuotas asociadas a línea, revisar la tabla de cuotas:

* si la cuota está guardada por `linea`, evaluar si debe migrarse a `reporte_prov_con_obs`
* si ya existe la lógica de cuotas correcta, solo adaptar la llave/dimensión del reporte sin cambiar la fórmula

12. Crear una vista de compatibilidad si ayuda a no romper el código existente.

Por ejemplo:

CREATE OR REPLACE VIEW vw_ventas_reporte AS
SELECT
*,
reporte_prov_con_obs AS linea_reporte
FROM fact_ventas;

13. Agregar pruebas o queries de validación:

* total venta neta antes vs después
* total por vendedor antes vs después
* total por cliente antes vs después
* cumplimiento por vendedor antes vs después
* negativos conservados
* reporte anterior por línea comparado contra nuevo reporte por `reporte_prov_con_obs`

14. Entregar:

* migración SQL
* cambios en queries/backend
* cambios en frontend si aplica
* explicación corta de qué archivos fueron modificados
* queries para validar que no cambió la lógica de cumplimiento

Criterio de éxito:

* El sistema sigue calculando cuotas y cumplimiento igual que antes.
* Los negativos siguen afectando el cumplimiento.
* La relación cliente-vendedor permite varios vendedores por cliente.
* El reporte de ventas por línea ahora usa `reporte_prov_con_obs` como dimensión principal.
* No se duplican ventas.
* No se pierden datos históricos.
