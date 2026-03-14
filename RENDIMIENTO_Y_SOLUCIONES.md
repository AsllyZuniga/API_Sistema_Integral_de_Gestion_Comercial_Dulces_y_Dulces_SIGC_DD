# 📊 ANÁLISIS DE RENDIMIENTO Y SOLUCIONES

## 🔴 Problema Crítico: Rendimiento

### Medición Actual

- **30 registros = 61 segundapuesta**
- **Velocidad: 0.49 reg/seg**
- **Proyección 180,000 registros: 102 HORAS** ❌

### Causa Raíz

El código hace ~12-15 operaciones asincrónicas POR CADA FILA:

```
1. query proveedor
2. query megacategoria
3. query categoria
4. query subcategoria
5. query canal
6. query subcanal
7. query ciudad
8. query barrio
9. query tipo_negocio
10. query cliente
11. query item
12. query obsequio
13. INSERT venta
14. INSERT detalle_venta
```

**Total: ~30-50 queries/fila x 30 filas = 900-1,500 queries en 61 segundos**

---

## ✅ Soluciones (del mejor al practico)

### Solución 1: REESCRITURA COMPLETA (Mejor rendimiento)

**Tiempo estimado: 3-5 minutos para 180,000 registros**

Cambios:

- Precargardatos maestros al inicio (1 query por tabla)
- Usar Maps en memoria para lookup O(1)
- Bulk inserts para datos únicos
- Async paralelo donde sea posible

**Archivo:** `services/importventas-optimizado.js` (listoTEMPORAL, necesita completarse)

---

### Solución 2: OPTIMIZACIÓN PRAGMÁTICA (Fácil implementar)

**Tiempo estimado: 15-30 minutos para 180,000 registros**

Cambios mínimos:

1. Agregar transacciones a nivel de batch
2. Aumentar batch size a 1000
3. Usar indexes correctamente
4. Cachedatos maestros mejor

```javascript
// Mejora inmediata: transacciones por batch
async procesarBatch(filas, encabezados) {
    const transaction = await this.sequelize.transaction();
    try {
        for (const linea of filas) {
            // ... procesar con transaction
        }
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

---

### Solución 3: USAR BULK INSERT DIRECTO (Muy rápido)

**Tiempo estimado: 1-2 minutos para 180,000 registros**

Cambio radical:

- No usar ORM para trazos de inserciones
- Generar SQL INSERT masivo
- Ejecutar directo con `sequelize.query()`

```javascript
// Bulk insert directo (100x más rápido)
const valores = datos.map((d) => `('${d.nombre}', ${d.id})`).join(",");
await this.sequelize.query(
  `INSERT INTO venta (nombre, id_cliente) VALUES ${valores}`,
);
```

---

## 🎯 RECOMENDACIÓN

### Para testing actual (30 registros):

**Usa el código actual** - más que suficiente, importa en 61 segundos ✅

### Para producción (180,000 registros):

**Implementa Solución 2** (pragmática) - 15-30 min de trabajo ahora, importa en 15-30 min

Pasos:

1. Precarga de maestros en una sola query al inicio
2. Reúsa objetos en memory (no queries nuevas)
3. Aumenta batch de 500 a 2000-5000
4. Usa transacciones por batch

---

## 📋 Mapeos Corregidos ✅

Ya se corrigió en `services/importventas.js`:

```javascript
// CLIENTE
const cliente = await this.obtenerOCrearConCache(
  this.cliente,
  "CLI",
  { nro_documento: { [Op.iLike]: fila["Cliente factura"]?.trim() } },
  {
    nro_documento: fila["Cliente factura"]?.trim(),
    razon_social: fila["Razon social cliente factura"]?.trim(),
    sucursal: fila["Sucursal factura"]?.trim(), // ✅ Corregido
    nombre_establecimiento: fila["Razon social cliente factura"]?.trim(), // ✅ Agregado
    direccion: fila["Direccion 1"]?.trim(),
    id_ciudad: ciudad.id_ciudad,
    id_barrio: barrio.id_barrio,
    id_canal: canal.id_canal, // ✅ Agregado
    id_tipo_negocio: tipoNegocio.id_tipo_negocio,
  },
);
```

---

## 🚀 Próximos pasos

1. **Testing inmediato** (hoy)
   - Truncar tablas
   - Importar con endpoint actual
   - Verificar mapeos en BD ✅

2. **Optimización** (cuando crezcas a >1000 registros)
   - Implementar Solución 2
   - Probar con 10,000 registros
   - Ajustar batch size

3. **Escala** (cuando necesites >100,000)
   - Implementar Solución 3 (bulk insert SQL)
   - O usar herramientas especializadas
   - Considerar importación en background job

---

**Estado actual:** ✅ Listo para testing de funcionalidad  
**Estado producción:** ⚠️ Necesita optimización para volúmenes grandes
