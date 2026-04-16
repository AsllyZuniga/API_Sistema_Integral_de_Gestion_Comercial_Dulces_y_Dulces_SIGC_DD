# 📋 Validación de Cuotas de Marzo - SIGC-DD

## 🎯 Objetivo

Verificar que las cuotas de categorías para marzo (2026-03-01 a 2026-03-31) estén correctamente cargadas en la base de datos y asociadas a los vendedores.

---

## 📡 Endpoints de Validación

### 1. **Validar Integridad de Cuotas de Marzo**

```
GET /cuota-categoria/validar/marzo
```

**Parámetros Query (Opcionales):**
```json
{
  "fechaInicio": "2026-03-01",  // Defecto
  "fechaFin": "2026-03-31"      // Defecto
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "mensaje": "Validación de cuotas de marzo completada",
  "periodo": {
    "fechaInicio": "2026-03-01",
    "fechaFin": "2026-03-31"
  },
  "resumen": {
    "total_vendedores": 4,
    "total_categorias": 13,
    "total_validaciones": 52
  },
  "validaciones": [
    {
      "vendedor": "De La Cruz",
      "codigo_vendedor": "0150",
      "categoria": "0300 - CAFES",
      "cuota_esperada": 38090263,
      "acumulado": 12500000,
      "porcentaje_cumplimiento": 32.83,
      "estado": "OK"
    },
    {
      "vendedor": "Yama",
      "codigo_vendedor": "0173",
      "categoria": "1201 - GALLETAS",
      "cuota_esperada": 8251910,
      "acumulado": 0,
      "porcentaje_cumplimiento": 0,
      "estado": "OK"
    }
    // ... más validaciones
  ],
  "warnings": [
    {
      "tipo": "CUOTAS_SIN_FECHAS",
      "cantidad": 0,
      "mensaje": "Existen cuotas sin fechas de inicio/fin definidas"
    }
  ],
  "timestamp": "2026-03-15T10:30:45.123Z"
}
```

**Qué Valida:**
- ✅ Todos los vendedores existentes en la BD
- ✅ Todas las categorías asociadas a cuotas
- ✅ Cuotas por categoría y vendedor para el período
- ✅ Cálculo de cumplimiento (acumulado vs cuota)
- ✅ Integridad de fechas en registros de cuota

---

### 2. **Comparar Cuotas CSV vs Base de Datos**

```
POST /cuota-categoria/validar/comparar-csv
```

**Body (application/json):**
```json
{
  "fechaInicio": "2026-03-01",
  "cuotas": [
    {
      "codigo_vendedor": "0150",
      "categorias": {
        "0300 - CAFES": 38090263,
        "1201 - GALLETAS": 7155926,
        "2950 - CHOCOLATES": 5200000,
        "1600 - BEBIDAS ENERGIZANTES": 4100000
      }
    },
    {
      "codigo_vendedor": "0173",
      "categorias": {
        "0300 - CAFES": 13917137,
        "1201 - GALLETAS": 8251910,
        "2950 - CHOCOLATES": 2500000
      }
    },
    {
      "codigo_vendedor": "0174",
      "categorias": {
        "0300 - CAFES": 6700000,
        "1201 - GALLETAS": 3500000
      }
    },
    {
      "codigo_vendedor": "0361",
      "categorias": {
        "0300 - CAFES": 12438847,
        "1201 - GALLETAS": 4200000,
        "2950 - CHOCOLATES": 6800000
      }
    }
  ]
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "mensaje": "Comparación CSV vs BD completada",
  "total_coincidencias": 48,
  "total_discrepancias": 4,
  "porcentaje_integridad": "92.31",
  "coincidencias": [
    {
      "codigo_vendedor": "0150",
      "categoria": "0300 - CAFES",
      "cuota": 38090263,
      "estado": "VERIFICADO"
    },
    {
      "codigo_vendedor": "0173",
      "categoria": "1201 - GALLETAS",
      "cuota": 8251910,
      "estado": "VERIFICADO"
    }
    // ... más coincidencias
  ],
  "discrepancias": [
    {
      "codigo_vendedor": "0150",
      "categoria": "0300 - CAFES",
      "cuota_csv": 38090263,
      "cuota_bd": 38090263,
      "diferencia": 0,
      "mensaje": "Cuota coincide"
    },
    {
      "codigo_vendedor": "0999",
      "tipo": "VENDEDOR_NO_ENCONTRADO",
      "mensaje": "Vendedor 0999 no existe en BD"
    }
  ]
}
```

**Qué Compara:**
- ✅ Vendedores CSV vs BD
- ✅ Categorías del CSV con registros en BD
- ✅ Valores de cuota CSV vs cuota en BD
- ✅ Detecta faltantes o discrepancias
- ✅ Calcula porcentaje de integridad

---

## 🔍 Interpretación de Resultados

### Estado "VERIFICADO" ✅
La cuota del CSV coincide exactamente con la de la BD. Sin problemas.

### Tipo "VENDEDOR_NO_ENCONTRADO" ⚠️
El código de vendedor del CSV no existe en la tabla `vendedor`. Acciones:
1. Revisar el código del vendedor en el CSV
2. Verificar que el vendedor esté registrado en BD
3. Validar que el `codigo_vendedor` sea correcto

### Tipo "CATEGORIA_NO_ENCONTRADA" ⚠️
La categoría del CSV no tiene datos de cuota para ese vendedor. Posibles causas:
1. Categoría no existe en BD
2. Cuota no fue cargada para esa categoría
3. Nombre de categoría no coincide entre CSV y BD

### Diferencia de Cuota ⚠️
El valor en CSV no coincide con la BD. Acciones:
1. Verificar cuál es el valor correcto
2. Actualizar la cuota en BD si es necesario
3. Revisar si hubo cambios posteriores al CSV

---

## 📊 Datos de Referencia - CSV Marzo 2026

**Vendedores a Validar:**

| Código | Nombre | Principales Categorías | 
|--------|--------|------------------------|
| 0150 | De La Cruz | CAFES (38M), GALLETAS (7.1M) |
| 0173 | Yama | CAFES (13.9M), GALLETAS (8.2M) |
| 0174 | Cuatis | CAFES (6.7M), GALLETAS (3.5M) |
| 0361 | Toro Melo | CAFES (12.4M), GALLETAS (4.2M) |

**Categorías a Validar:**
- 0300 - CAFES
- 1201 - GALLETAS
- 2950 - CHOCOLATES
- 1600 - BEBIDAS ENERGIZANTES
- Más según el CSV

---

## 🛠️ Cómo Usar los Endpoints

### Opción 1: Validación Rápida (Recomendada)

```bash
# 1. Validar integridad general
curl -X GET "http://localhost:3000/cuota-categoria/validar/marzo" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Revisar los resultados:
# - Warnings: Alguna categoría sin fechas?
# - Validaciones: Todos los vendedores tienen datos?
# - Porcentaje cumplimiento: ¿Hay vendedores con 0%?
```

**Qué Buscar:**
- ❌ `"warnings"` vacío (buena señal)
- ❌ Todos los vendedores con `"estado": "OK"`
- ✅ Algún `porcentaje_cumplimiento` negativo?

### Opción 2: Validación Detallada (Con CSV)

```bash
# Preparar JSON con datos del CSV
curl -X POST "http://localhost:3000/cuota-categoria/validar/comparar-csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cuotas": [...]}'  # Ver estructura arriba

# Revisar:
# - "porcentaje_integridad": Debería ser 100% si todo está correcto
# - "discrepancias": Si hay, analizarlas
```

---

## 🐛 Troubleshooting

### Problema: "Vendedor no tiene datos de venta"
**Causa:** El vendedor no tiene registros de venta en el período.
**Solución:** 
- Verificar que hay ventas para este vendedor en marzo
- Usar `/detalle-venta?vendedor=0150` para verificar

### Problema: "Categoría no tiene datos en BD"
**Causa:** Categoría no fue cargada al importar cuotas.
**Solución:**
- Revisar que la migración de cuotas ejecutó correctamente
- Verificar contenido de tabla `cuotaCategoria` en BD

### Problema: "Porcentaje de integridad < 100%"
**Causa:** Hay discrepancias entre CSV y BD.
**Solución:**
- Revisar lista de `discrepancias` en respuesta
- Actualizar cuotas faltantes o incorrectas
- Re-ejecutar validación

---

## 📌 Notas Importantes

1. **Período por Defecto:** 2026-03-01 a 2026-03-31
   - Cambiar con parámetros `fechaInicio` y `fechaFin` si es necesario

2. **Requiere JWT:** Ambos endpoints requieren token Bearer válido
   - Incluir header: `Authorization: Bearer <token>`

3. **Función GROUP BY:** La consulta agrupa por:
   - Vendedor (id_vendedor)
   - Categoría (id_categoria)
   - Año y Mes de la cuota

4. **Cálculo de Cumplimiento:**
   ```
   porcentaje = (acumulado / cuota) * 100
   proyectado = (acumulado / días_transcurridos) * días_totales
   ```

---

## 📄 Archivo CSV Esperado

**Ubicación:** `/cuotasCategoriasMarzo.csv`

**Estructura:**
```csv
nombre,codigo_vendedor,0300 - 1000-CAFES,1201 - GALLETAS,2950 - CHOCOLATES,...
De La Cruz,0150,38090263,7155926,5200000,...
Yama,0173,13917137,8251910,2500000,...
Cuatis,0174,6700000,3500000,1800000,...
Toro Melo,0361,12438847,4200000,6800000,...
```

**Headers:**
- `nombre`: Nombre del vendedor
- `codigo_vendedor`: Código numérico (0150, 0173, etc.)
- `[CATEGORIA]`: Columnas con valores de cuota por categoría

---

## ✅ Checklist de Validación

- [ ] GET `/cuota-categoria/validar/marzo` retorna 200 OK
- [ ] Todos los 4 vendedores están en la respuesta
- [ ] No hay `"warnings"` sobre cuotas sin fechas
- [ ] POST `/cuota-categoria/validar/comparar-csv` con datos del CSV retorna 200
- [ ] `porcentaje_integridad` es 100% o muy cercano
- [ ] No hay `discrepancias` críticas
- [ ] Cada vendedor tiene sus categorías asignadas
- [ ] Valores de cuota coinciden con el CSV

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs del servidor: `npm start`
2. Verificar que las migraciones ejecutaron: `npx sequelize-cli db:migrate`
3. Validar estructura CSV (sin caracteres especiales en números)
4. Verificar JWT token es válido

