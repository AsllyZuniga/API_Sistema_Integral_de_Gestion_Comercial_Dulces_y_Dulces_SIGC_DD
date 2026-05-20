# Endpoint: Vendedores con Clientes e Items Comprados

## 📋 Descripción

Este endpoint trae una lista de **vendedores** con todos sus **clientes asociados** y los **items que cada cliente ha comprado**, optimizado para no sobrecargar la base de datos mediante **lazy loading** y **paginación en cada nivel**.

## 🔗 Ruta

```
GET /vendedor/con-items-comprados
```

## ⚙️ Parámetros de Query (Todos Opcionales)

| Parámetro | Tipo | Valor por Defecto | Máximo | Descripción |
|-----------|------|-------------------|--------|-------------|
| `vendedoresPage` | `integer` | `1` | - | Página de vendedores |
| `vendedoresLimit` | `integer` | `10` | `100` | Items por página de vendedores |
| `clientesPage` | `integer` | `1` | - | Página de clientes por vendedor |
| `clientesLimit` | `integer` | `5` | `50` | Items por página de clientes |
| `itemsPage` | `integer` | `1` | - | Página de items por cliente |
| `itemsLimit` | `integer` | `10` | `100` | Items por página de items |

## 📥 Ejemplos de Llamadas

### Ejemplo 1: Uso Básico (valores por defecto)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados"
```

### Ejemplo 2: Con Paginación Personalizada
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=1&vendedoresLimit=5&clientesPage=1&clientesLimit=3&itemsPage=1&itemsLimit=5"
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
                "nombre": "Chocolate Premium",
                "codigo": "CHO-001",
                "cantidadTotal": 150.5,
                "veces": 8
              },
              {
                "id_item": 101,
                "nombre": "Caramelos Mix",
                "codigo": "CAR-001",
                "cantidadTotal": 75.0,
                "veces": 3
              }
            ],
            "paginacionItems": {
              "page": 1,
              "limit": 10,
              "total": 12
            }
          },
          {
            "id_cliente": 11,
            "nro_documento": "87654321",
            "razon_social": "Confitería B",
            "totalCompras": 15,
            "items": [
              {
                "id_item": 102,
                "nombre": "Dulce de Leche",
                "codigo": "DUL-001",
                "cantidadTotal": 200.0,
                "veces": 5
              }
            ],
            "paginacionItems": {
              "page": 1,
              "limit": 10,
              "total": 1
            }
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
├── totalCompras: número (cantidad de ventas del cliente a este vendedor)
├── items[]: array de items comprados
└── paginacionItems: objeto de paginación
```

### Nivel 3: Items (dentro de cada cliente)
```
items[]
├── id_item: número
├── nombre: string
├── codigo: string
├── cantidadTotal: número decimal (suma de cantidades compradas)
├── veces: número (cantidad de veces que se compró este item)
```

### Paginación
```
paginacion*
├── page: número (página actual)
├── limit: número (items por página)
└── total: número (total de items disponibles)
```

## ⚠️ Respuestas de Error

### Error 500 - Error Interno del Servidor
```json
{
  "success": false,
  "message": "Error al obtener vendedores con clientes e items",
  "error": "Error específico"
}
```

## 🔄 Flujo de Carga Diferida (Lazy Loading)

El endpoint funciona con **tres niveles de paginación independientes**:

1. **Vendedores**: Se traen paginados según `vendedoresPage` y `vendedoresLimit`
2. **Clientes**: Para cada vendedor, se traen sus clientes paginados según `clientesPage` y `clientesLimit`
3. **Items**: Para cada cliente, se traen los items comprados paginados según `itemsPage` y `itemsLimit`

### Ventajas de este Enfoque

✅ **Optimizado para BD**: No carga todo de una vez  
✅ **Lazy Loading**: Cada nivel se carga por separado  
✅ **Escalable**: Funciona con miles de vendedores/clientes  
✅ **Paginación Flexible**: Controla cuántos resultados quieres en cada nivel  
✅ **Información Útil**: `totalCompras` y `veces` dan contexto de compras  

## 💡 Casos de Uso

### 1. Dashboard Principal - Ver Resumen
```bash
# Primer vendedor, 3 clientes, 5 items por cliente
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesLimit=3&itemsLimit=5
```

### 2. Explorar Clientes de un Vendedor (Frontend hace este llamado)
```bash
# Mantener vendedor fijo, cargar más clientes
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesPage=2&clientesLimit=10
```

### 3. Ver Historial Completo de Compras de un Cliente (Frontend hace este llamado)
```bash
# Mantener vendedor y cliente, aumentar items por página
GET /vendedor/con-items-comprados?vendedoresLimit=1&clientesLimit=1&itemsPage=1&itemsLimit=50
```

### 4. Reporte de Todos los Vendedores
```bash
# Traer todos los vendedores con paginación
GET /vendedor/con-items-comprados?vendedoresLimit=100&clientesLimit=10
```

## 🎯 Recomendaciones

- **Inicialmente**: Usar valores pequeños (`vendedoresLimit=10, clientesLimit=5, itemsLimit=10`) para no sobrecargar
- **Para reportes**: Aumentar límites según necesidad, pero mantener bajo 100 por nivel
- **Frontend**: Implementar lazy loading - al hacer scroll, incrementar `Page` en lugar de `Limit`
- **Monitoreo**: Medir tiempos de respuesta para ajustar límites según rendimiento

## 🔒 Notas de Seguridad

- El endpoint **no filtra por rol de usuario** por defecto. Considera agregar middleware de autorización si es necesario
- Los resultados incluyen **todas las compras públicamente visibles**. Validar permisos según tu lógica de negocio

## 📝 Changelog

### v1.0.0 (Inicial)
- Endpoint creado
- Soporte para lazy loading en 3 niveles
- Paginación flexible por nivel
