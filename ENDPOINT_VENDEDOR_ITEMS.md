# Endpoint: Vendedores con Clientes e Items Comprados

## 📋 Descripción

Este endpoint trae una lista de **vendedores** con todos sus **clientes asociados** y los **items que cada cliente ha comprado**, optimizado para no sobrecargar la base de datos mediante **lazy loading** y **paginación en cada nivel**.

## 🔗 Ruta

```
GET /vendedor/con-items-comprados
```

> Requiere **Authorization: Bearer <token>** de cualquier rol autenticado.
> El alcance de los datos se determina por el **rol del token**:
> - **Admin (rol=1)**: devuelve todos los vendedores con sus clientes e items.
> - **Supervisor (rol=2)**: devuelve solo los vendedores asignados al supervisor (donde `id_supervisor = idUsuario` del token).
> - **Vendedor (rol=3)**: devuelve solo el vendedor autenticado (donde `id_vendedor = idVendedor` del token), con los clientes que él atendió y los items que esos clientes le compraron.

## ⚙️ Parámetros de Query (Todos Opcionales)

| Parámetro | Tipo | Valor por Defecto | Máximo | Descripción |
|-----------|------|-------------------|--------|-------------|
| `vendedoresPage` | `integer` | `1` | - | Página de vendedores |
| `vendedoresLimit` | `integer` | `10` | `100` | Items por página de vendedores |
| `clientesPage` | `integer` | `1` | - | Página de clientes por vendedor |
| `clientesLimit` | `integer` | `5` | `50` | Items por página de clientes |
| `fechaInicio` | `string (YYYY-MM-DD)` | - | - | Fecha inicial para filtrar ventas |
| `fechaFin` | `string (YYYY-MM-DD)` | - | - | Fecha final para filtrar ventas |

> **Nota**: Los items por cliente **no se paginan**. Se devuelven todos los items comprados dentro del rango de fechas.

## 📥 Ejemplos de Llamadas

### Ejemplo 1: Uso Básico (valores por defecto)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados"
```

### Ejemplo 1B: Con rango de fechas
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?fechaInicio=2026-05-01&fechaFin=2026-05-31"
```

### Ejemplo 1B: Supervisor (solo vendedores asignados)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresLimit=10&clientesLimit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
> El token del supervisor hace que el endpoint devuelva automáticamente solo sus vendedores asignados. No requiere endpoint separado.

### Ejemplo 1C: Vendedor (solo sus clientes)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresLimit=1&clientesLimit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
> El token del vendedor hace que el endpoint devuelva solo el registro de ese vendedor con los clientes que él atendió y los items que esos clientes le compraron. No requiere endpoint separado.

### Ejemplo 2: Con Paginación Personalizada
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=1&vendedoresLimit=5&clientesPage=1&clientesLimit=3"
```

### Ejemplo 3: Segunda página de vendedores
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=2&vendedoresLimit=10"
```

### Ejemplo 4: Con Authorization (si está protegido)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📤 Respuesta de Éxito (200 OK)

```json
{
  "success": true,
  "data": {
    "vendedores": [
      {
        "id_vendedor": 1,
        "codigo_vendedor": "VEN-001",
        "nombre": "Juan Pérez",
        "clientes": [
          {
            "id_cliente": 10,
            "nro_documento": "12345678",
            "razon_social": "Tienda A SRL",
            "totalCompras": 25,
            "items": [
              {
                "id_item": 100,
                "descripcion": "Chocolate Premium",
                "codigo_item": "CHO-001",
                "cantidadTotal": 150.5,
                "veces": 8,
                "precio_unitario": 2500,
                "subtotal": 376250
              },
              {
                "id_item": 101,
                "descripcion": "Caramelos Mix",
                "codigo_item": "CAR-001",
                "cantidadTotal": 75.0,
                "veces": 3,
                "precio_unitario": 1200,
                "subtotal": 90000
              }
            ],
            "totalItems": 2
          },
          {
            "id_cliente": 11,
            "nro_documento": "87654321",
            "razon_social": "Confitería B",
            "totalCompras": 15,
            "items": [
              {
                "id_item": 102,
                "descripcion": "Dulce de Leche",
                "codigo_item": "DUL-001",
                "cantidadTotal": 200.0,
                "veces": 5,
                "precio_unitario": 3500,
                "subtotal": 700000
              }
            ],
            "totalItems": 1
          }
        ],
        "paginacionClientes": {
          "page": 1,
          "limit": 5,
          "total": 45
        }
      },
      {
        "id_vendedor": 2,
        "codigo_vendedor": "VEN-002",
        "nombre": "María García",
        "clientes": [],
        "paginacionClientes": {
          "page": 1,
          "limit": 5,
          "total": 0
        }
      }
    ],
    "paginacionVendedores": {
      "page": 1,
      "limit": 10,
      "total": 50
    }
  },
  "message": "Datos de vendedores, clientes e items obtenidos exitosamente"
}
```

## 📊 Estructura de Respuesta

### Nivel 1: Vendedores
```
vendedores[]
├── id_vendedor: número
├── codigo_vendedor: string
├── nombre: string
├── clientes[]: array de clientes
└── paginacionClientes: objeto de paginación
```

### Nivel 2: Clientes (dentro de cada vendedor)
```
clientes[]
├── id_cliente: número
├── nro_documento: string
├── razon_social: string
├── totalCompras: número (cantidad de ventas del cliente a este vendedor en el rango de fechas)
├── items[]: array de items comprados (sin paginación, se devuelven todos)
└── totalItems: número (cantidad de items en el array)
```

### Nivel 3: Items (dentro de cada cliente)
```
items[]
├── id_item: número
├── descripcion: string
├── codigo_item: string
├── cantidadTotal: número decimal (suma de cantidades compradas)
├── veces: número (cantidad de veces que se compró este item)
├── precio_unitario: número decimal (promedio)
└── subtotal: número decimal (suma)
```

### Paginación
```
paginacion*
├── page: número (página actual)
├── limit: número (items por página)
└── total: número (total de items disponibles)
```

## ⚠️ Respuestas de Error

### Error 400 - Token sin datos del rol
```json
{
  "success": false,
  "message": "No se pudo identificar el supervisor en el token",
  "error": "SUPERVISOR_NO_IDENTIFICADO"
}
```
```json
{
  "success": false,
  "message": "El token no contiene idVendedor",
  "error": "VENDEDOR_NO_IDENTIFICADO"
}
```

### Error 403 - Rol no autorizado
```json
{
  "success": false,
  "message": "Rol no autorizado para este endpoint"
}
```

### Error 500 - Error Interno del Servidor
```json
{
  "success": false,
  "message": "Error al obtener vendedores con clientes e items",
  "error": "Error específico"
}
```

## 🔄 Flujo de Carga Diferida (Lazy Loading)

El endpoint funciona con **dos niveles de paginación** y los items se devuelven completos:

1. **Vendedores**: Se traen paginados según `vendedoresPage` y `vendedoresLimit`
2. **Clientes**: Para cada vendedor, se traen sus clientes paginados según `clientesPage` y `clientesLimit`
3. **Items**: Para cada cliente, se traen **todos** los items comprados (sin paginación)

### Ventajas de este Enfoque

✅ **Optimizado para BD**: No carga todos los vendedores/clientes de una vez  
✅ **Lazy Loading**: Cada nivel se carga por separado  
✅ **Items completos**: Sin truncar el historial de compras del cliente  
✅ **Escalable**: Funciona con miles de vendedores/clientes  
✅ **Información Útil**: `totalCompras` y `veces` dan contexto de compras  

## 💡 Casos de Uso

### 1. Dashboard Principal - Ver Resumen
```bash
# Primer vendedor, 3 clientes
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesLimit=3
```

### 2. Explorar Clientes de un Vendedor (Frontend hace este llamado)
```bash
# Mantener vendedor fijo, cargar más clientes
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesPage=2&clientesLimit=10
```

### 3. Ver Historial Completo de Compras de un Cliente
```bash
# Los items se devuelven completos para cada cliente, sin paginación
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesLimit=1
```

### 4. Reporte de Todos los Vendedores
```bash
# Traer todos los vendedores con paginación
GET /vendedor/con-items-comprados?vendedoresLimit=100&clientesLimit=10
```

## 🎯 Recomendaciones

- **Inicialmente**: Usar valores pequeños (`vendedoresLimit=10, clientesLimit=5`) para no sobrecargar
- **Items**: Se devuelven completos por cliente (sin paginación). Si un cliente tiene 500 items, se traen los 500
- **Frontend**: Implementar lazy loading - al hacer scroll en el árbol, incrementar `Page` de vendedores/clientes
- **Monitoreo**: Medir tiempos de respuesta para ajustar límites según rendimiento

## 🔒 Notas de Seguridad

- El endpoint **filtra los datos por rol del token**:
  - Admin ve todos los vendedores
  - Supervisor ve solo los vendedores asignados a él
  - Vendedor ve solo su propio registro
- Los resultados visibles dependen de los permisos del usuario autenticado. No es necesario agregar middleware adicional.

## 📝 Changelog

### v1.2.0
- **Eliminada paginación de items**: los items se devuelven completos por cliente, sin `itemsPage`/`itemsLimit`
- Bugfix: la query de clientes ahora usa `INNER JOIN` con `venta` filtrado por `id_vendedor`, evitando que se devuelvan los mismos clientes para todos los vendedores
- `paginacionItems` reemplazado por `totalItems` en la respuesta

### v1.1.0
- Endpoint unificado: una sola ruta `/vendedor/con-items-comprados` con detección de rol por token
- Soporte para los 3 roles: admin, supervisor y vendedor
- Corrección de orden: resultados ordenados alfabéticamente por `LOWER(nombre)` y `LOWER(razon_social)`
- Cambio de INNER JOIN a LEFT JOIN: los clientes que no compraron en el rango de fechas siguen apareciendo con `totalCompras: 0` e `items: []`
- Campo `item.nombre` → `item.descripcion` (alineado con el modelo real)
- Campo `item.codigo` → `item.codigo_item` (alineado con el modelo real)
- Eliminada ruta `/vendedor/supervisor/con-items-comprados` (reemplazada por la versión unificada)

### v1.0.0 (Inicial)
- Endpoint creado
- Soporte para lazy loading en 3 niveles
- Paginación flexible por nivel
