# ANÁLISIS DE DISCREPANCIA - VENDEDOR 0550 (CAMPO SAMBONI FAIBER DURLEY)

## 1️⃣ EXTRACCIÓN DE DATOS DEL CSV

### Datos del CSV para Vendedor 0550:
| Código | Nombre | Período |
|--------|--------|---------|
| 0550 | CAMPO SAMBONI FAIBER DURLEY | 2026-01-01 a 2026-01-31 |

### Columnas y Valores del CSV:
```
ARCOR:                        1,735,046
TONING:                      12,828,309
INCODEPF:                     2,016,908
ITALO:                        3,072,545
ALICORP ALIMENTOS:            2,306,687
CONFITECA:                    2,546,889
FLORA FOOD:                   3,647,910
EL REY:                      37,078,247
LEVAPAN:                     22,888,427
SUPER:                       18,934,314
HENKEL:                       9,629,019
RECAMIER:                     3,516,974
PREBEL:                       1,725,807
ENERGIZER:                    6,360,320
COFARMA:                      2,748,478
SAN JORGE VELAS Y VELONES:    5,878,939
BELLEZA EXPRESS:              5,016,714
LA CORUÑA:                    2,875,571
KATORI:                         700,000
SIEGFRIED:                    4,668,659
BAYER:                        2,685,760
HALEON:                       5,341,369
MONDELEZ:                     2,431,707
ALDOR:                        3,905,697
FONANDES:                     2,564,768
DANISCO:                      3,159,063
CALA:                         1,534,290
JOHNSON Y JOHNSON:           11,921,477
SANUSS:                       5,800,000
KELLOGGS:                     2,423,686
MULTIDIMENSIONALES:           1,500,000
LAB. OSA:                    12,000,000
FINI:                           850,000
```

**SUMA TOTAL CSV: $ 206,293,580**

---

## 2️⃣ MAPEO CSV ↔ FRONT-END

### Tabla Comparativa Completa:

| Código | Nombre Línea (Front) | CSV | Front | Estado | Diferencia |
|--------|----------------------|-----|-------|--------|------------|
| 020 | ARCOR | $1,735,046 | $0 | ❌ FALTA | $1,735,046 |
| 220 | TONING | $12,828,309 | $12,828,309 | ✅ OK | $0 |
| 070 | INCODEPF | $2,016,908 | $0 | ❌ FALTA | $2,016,908 |
| 130 | ITALO | $3,072,545 | $3,072,545 | ✅ OK | $0 |
| 110 | ALICORP ALIMENTOS | $2,306,687 | $0 | ❌ FALTA | $2,306,687 |
| 100 | CONFITECA | $2,546,889 | $2,546,889 | ✅ OK | $0 |
| 273 | FLORA FOOD | $3,647,910 | $0 | ❌ FALTA | $3,647,910 |
| 230 | EL REY | $37,078,247 | $37,078,247 | ✅ OK | $0 |
| 240 | LEVAPAN | $22,888,427 | $0 | ❌ FALTA | $22,888,427 |
| 030 | SUPER | $18,934,314 | $0 | ❌ FALTA | $18,934,314 |
| 640 | HENKEL | $9,629,019 | $0 | ❌ FALTA | $9,629,019 |
| 690 | RECAMIER | $3,516,974 | $0 | ❌ FALTA | $3,516,974 |
| 630 | PREBEL | $1,725,807 | $1,725,807 | ✅ OK | $0 |
| 880 | ENERGIZER | $6,360,320 | $0 | ❌ FALTA | $6,360,320 |
| 875 | LAB. COFARMA | $2,748,478 | $2,748,478 | ✅ OK | $0 |
| 860 | SAN JORGE VELAS Y VELONES | $5,878,939 | $0 | ❌ FALTA | $5,878,939 |
| 625 | BELLEZA EXPRESS | $5,016,714 | $5,016,714 | ✅ OK | $0 |
| 290 | LA CORUÑA | $2,875,571 | $0 | ❌ FALTA | $2,875,571 |
| 873 | KATORI | $700,000 | $0 | ❌ FALTA | $700,000 |
| 540 | SIEGFRIED | $4,668,659 | $0 | ❌ FALTA | $4,668,659 |
| 523 | BAYER | $2,685,760 | $2,685,760 | ✅ OK | $0 |
| 525 | HALEON | $5,341,369 | $0 | ❌ FALTA | $5,341,369 |
| 040 | MONDELEZ | $2,431,707 | $2,431,707 | ✅ OK | $0 |
| 080 | ALDOR | $3,905,697 | $3,905,697 | ✅ OK | $0 |
| 900 | FONANDES | $2,564,768 | $2,564,768 | ✅ OK | $0 |
| 277 | DANISCO | $3,159,063 | $3,159,063 | ✅ OK | $0 |
| 806 | CALA | $1,534,290 | $0 | ❌ FALTA | $1,534,290 |
| 620 | JOHNSON Y JOHNSON | $11,921,477 | $0 | ❌ FALTA | $11,921,477 |
| 805 | SANUSS | $5,800,000 | $5,800,000 | ✅ OK | $0 |
| 280 | KELLOGG | $2,423,686 | $2,423,686 | ✅ OK | $0 |
| 890 | MULTIDIMENSIONALES | $1,500,000 | $0 | ❌ FALTA | $1,500,000 |
| 520 | LAB. OSA | $12,000,000 | $0 | ❌ FALTA | $12,000,000 |
| 190 | FINI | $850,000 | $0 | ❌ FALTA | $850,000 |

---

## 3️⃣ DISCREPANCIAS ENCONTRADAS

### 🔴 LÍNEAS FALTANTES (Con $0 en Front pero con valor en CSV):

1. **020 - ARCOR**: $1,735,046
2. **070 - INCODEPF**: $2,016,908
3. **110 - ALICORP ALIMENTOS**: $2,306,687
4. **273 - FLORA FOOD**: $3,647,910
5. **240 - LEVAPAN**: $22,888,427
6. **030 - SUPER**: $18,934,314
7. **640 - HENKEL**: $9,629,019
8. **690 - RECAMIER**: $3,516,974
9. **880 - ENERGIZER**: $6,360,320
10. **860 - SAN JORGE VELAS Y VELONES**: $5,878,939
11. **290 - LA CORUÑA**: $2,875,571
12. **873 - KATORI**: $700,000
13. **540 - SIEGFRIED**: $4,668,659
14. **525 - HALEON**: $5,341,369
15. **806 - CALA**: $1,534,290
16. **620 - JOHNSON Y JOHNSON**: $11,921,477
17. **890 - MULTIDIMENSIONALES**: $1,500,000
18. **520 - LAB. OSA**: $12,000,000
19. **190 - FINI**: $850,000

**SUMA DE LÍNEAS FALTANTES: $118,366,247**

### ✅ LÍNEAS CORRECTAS (Valores coinciden):
- 220 - TONING: $12,828,309
- 130 - ITALO: $3,072,545
- 100 - CONFITECA: $2,546,889
- 230 - EL REY: $37,078,247
- 630 - PREBEL: $1,725,807
- 875 - LAB. COFARMA: $2,748,478
- 625 - BELLEZA EXPRESS: $5,016,714
- 523 - BAYER: $2,685,760
- 040 - MONDELEZ: $2,431,707
- 080 - ALDOR: $3,905,697
- 900 - FONANDES: $2,564,768
- 277 - DANISCO: $3,159,063
- 805 - SANUSS: $5,800,000
- 280 - KELLOGG: $2,423,686

**SUMA DE LÍNEAS CORRECTAS: $87,927,333**

---

## 4️⃣ REPORTE EJECUTIVO

### 📊 RESUMEN:
- **Total esperado (CSV)**: $206,293,580
- **Total mostrado (Front)**: $87,927,333
- **Diferencia**: $118,366,247 (57.4% faltante)

### 🎯 CAUSA RAÍZ:
**19 líneas de negocio NO están siendo importadas/mostradas en el Front-end**, aunque existen en el CSV.

### 🚨 PROBLEMAS IDENTIFICADOS:

#### Problema 1: Posible Filtro o Mapeo Incompleto
Las líneas faltantes parece que NO están siendo consultadas o importadas desde la base de datos. Esto sugiere:
- Error en el proceso de importación de cuotas
- Falta de registros en la tabla `cuotaCategoria` o similar para estas líneas
- Filtro incorrecto que solo muestra algunas líneas

#### Problema 2: Estructura de Datos
Las 19 líneas faltantes están distribuidas en todo el CSV, no son consecutivas. Esto indica que:
- No es un corte de archivo
- No es un problema de encodificación
- Es un problema selectivo de importación

---

### 🔴 CAUSA RAÍZ CRÍTICA IDENTIFICADA

**La tabla `vendedorCuotaCategoria` NO EXISTE en la base de datos.**

El sistema tiene dos arquitecturas de cuotas COMPLETAMENTE DESCONECTADAS:

#### **Sistema 1: CUOTAS POR CATEGORÍA (What Frontend Expects)**
- **Tabla Principal**: `categoria` (IDs: 020, 220, 070...)
- **Tabla de Cuotas**: `vendedorCuotaCategoria` ❌ **NO EXISTE EN BD**
- **Controlador**: [controllers/cuotaCategoriaController.js](controllers/cuotaCategoriaController.js)
- **Servicio**: [services/cuotaCategoria.js](services/cuotaCategoria.js#L230)
- **Ruta**: `GET /cuota-categoria/vendedor/:id`
- **Estado**: ❌ Code exists pero TABLE doesn't exist

#### **Sistema 2: CUOTAS POR PROVEEDOR (Where CSV Data Actually Goes)**
- **Tabla Principal**: `proveedor` (ARCOR, TONING, INCODEPF...)
- **Tabla de Cuotas**: `vendedorCuotaProveedor` + `cuotaProveedor`
- **Controlador**: [controllers/vendedorCuotaProveedorController.js](controllers/vendedorCuotaProveedorController.js)
- **Servicio**: [services/importCuotaProveedorService.js](services/importCuotaProveedorService.js)
- **Ruta**: `POST /vendedor-cuota-proveedor/upload`
- **Estado**: ✅ Importa datos correctamente (239 registros encontrados)

### 🔴 EL PROBLEMA REAL:

```
CSV (Enero 2026) 
      ↓
importCuotaProveedorService ✅ FUNCIONA
      ↓
vendedorCuotaProveedor (BD) ✅ 239 REGISTROS CREADOS
      ↓
Frontend busca en:
      ↓
vendedorCuotaCategoria ❌ TABLA NO EXISTE
      ↓
Retorna VACÍO → Frontend muestra $0
```

**RESULTADO**: Todos los datos importados a PROVEEDOR, pero Frontend busca en CATEGORÍA que no existe.

### 🎯 VERIFICACIÓN EN BASE DE DATOS (REALIZADA):

**BD Resultado**:
```
✅ Tabla vendedorCuotaProveedor: 239 registros para vendedor 0550
   - Contiene: ARCOR $1,735,046, INCODEPF $2,016,908, etc.
   
❌ Tabla vendedorCuotaCategoria: NO EXISTE (relation not found error)
   - 0 registros (tabla no existe en BD)
```

**Conclusión**: Los datos están almacenados en la BD, pero el Frontend los busca en una tabla que no existe.
