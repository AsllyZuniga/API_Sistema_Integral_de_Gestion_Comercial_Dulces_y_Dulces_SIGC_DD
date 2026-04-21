# 🔧 CORRECCIONES PERMANENTES - DUPLICADOS DE CATEGORÍAS

**Fecha**: 15 de Abril 2026  
**Problema**: Importador creaba cuotas globales incorrectas + BD tenía categorías duplicadas  
**Solución**: Tabla intermedia + validaciones estrictas

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Nueva Tabla: `vendedor_cuota_categoria`**
```sql
CREATE TABLE vendedor_cuota_categoria (
  id BIGSERIAL PRIMARY KEY,
  id_vendedor INTEGER NOT NULL (FK),
  id_categoria INTEGER NOT NULL (FK),
  cuota BIGINT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  UNIQUE (id_vendedor, id_categoria, fecha_inicio, fecha_fin)
);
```

**Beneficio**: Cada vendedor puede tener DIFERENTES cuotas para MISMA categoría
- Vendedor A: Café = 38M
- Vendedor B: Café = 14M
- NO hay conflicto, cada uno tiene su cuota específica

---

### 2. **Validación de Duplicados en Importador**
**Archivo**: `services/cuotaCategoriaImportServiceStricto.js`

```javascript
// NUEVO: Detecta y rechaza si hay categorías duplicadas en BD
if (duplicadosEnBD.length > 0) {
    throw new Error(`BD corrupta: ${duplicadosEnBD.length} categorías duplicadas`);
}
```

**Comportamiento**:
- ❌ Si hay categorías con mismo nombre pero ID diferente → ERROR
- ✅ Importación CANCELA y reporta exactamente cuál está duplicada

---

### 3. **Almacenamiento de Cuotas**
**Antes**:
```javascript
// ❌ INCORRECTO: Creaba cuota global (todos tenían misma cuota)
categoria.update({ id_cuota_categoria: 1, cuota: 38M })
```

**Ahora**:
```javascript
// ✅ CORRECTO: Guarda cuota específica por vendedor
vendedor_cuota_categoria.insert({
    id_vendedor: 142,
    id_categoria: 747,
    cuota: 38090263
})
```

---

### 4. **Consultas Actualizadas**
**Archivo**: `services/cuotaCategoria.js`

#### Consulta por Vendedor
```sql
-- ANTES: LEFT JOIN cuotaCategoria (global incorrecta)
-- AHORA: LEFT JOIN vendedor_cuota_categoria (específica por vendedor)
LEFT JOIN vendedor_cuota_categoria vqc ON 
    vqc.id_vendedor = :idVendedor
    AND vqc.id_categoria = apcn.id_categoria
    AND vqc.fecha_inicio <= :fechaFin
    AND vqc.fecha_fin >= :fechaInicio
```

---

## 🛡️ PROTECCIONES CONTRA FUTURO

| Problema | Protección | Dónde |
|----------|-----------|-------|
| Duplicados de categorías en BD | Validación previa + UNIQUE (id_vendedor, id_categoria, fecha) | importServiceStricto |
| Cuotas globales incorrectas | Nueva tabla con PK (vendedor, categoría, período) | vendedor_cuota_categoria |
| Queries leyendo datos viejos | Todas las queries actualizadas a nueva tabla | cuotaCategoria.js |
| Importación parcial | Transacciones + validación antes de insertar | importServiceStricto |

---

## ✅ VERIFICACIÓN POST-CARGA

**Después de cargar cada CSV, verifica**:

```bash
# 1. ¿Hay duplicados de categorías?
node verify_duplicates.js

# 2. ¿Están las cuotas en la tabla correcta?
SELECT * FROM vendedor_cuota_categoria 
WHERE fecha_inicio = '2026-03-01' LIMIT 5;

# 3. ¿El endpoint devuelve cuotas correctas?
curl "http://localhost:3000/cuota-categoria/vendedor/0150?fechaInicio=2026-03-01&fechaFin=2026-03-31"
```

---

## 📋 CHECKLIST PARA FUTURAS CARGAS

- [ ] **Validar CSV**: No hay vendedores inválidos
- [ ] **Validar CSV**: No hay categorías inválidas
- [ ] **Validar CSV**: Fechas en formato YYYY-MM-DD
- [ ] **Backup BD**: Antes de importar
- [ ] **POST /validar**: Confirmar validación OK
- [ ] **POST /cargar**: Proceder con importación
- [ ] **Verificar resultado**: Cuotas en tabla correcta
- [ ] **Probar endpoint**: GET /cuota-categoria/vendedor/:codigo

---

## 🚨 SI VUELVE A FALLAR

1. Ejecuta: `node fix_all_duplicates.js` (limpia categorías viejas)
2. Ejecuta: `node cleanup_and_reload.js` (borra datos corruptos)
3. Ejecuta: `node setup_schema.js` (recrea tabla vendedor_cuota_categoria)
4. Recarga el CSV

---

## 📚 DOCUMENTACIÓN

- Importador: `services/cuotaCategoriaImportServiceStricto.js`
- Consultas: `services/cuotaCategoria.js`
- Tabla: `vendedor_cuota_categoria`
- Validación: `controllers/cuotaCategoriaImportController.js`
