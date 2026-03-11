# ✅ CHECKLIST - Próximos pasos

## Fase 1: Verificación de Cambios (5 min)

- [ ] Consultar BD y verificar que los registros importados tengan:
  ```sql
  SELECT 
    c.sucursal, 
    c.nombre_establecimiento, 
    c.id_canal,
    c.razon_social
  FROM cliente c
  LIMIT 5;
  ```

- [ ] Si los valores están vacíos:
  - [ ] Ejecutar: `npm run db:drop` (⚠️ borra datos)
  - [ ] Ejecutar: `npm run db:migrate`
  - [ ] Importar de nuevo con endpoint

- [ ] Si los valores están poblados ✅ pasar a Fase 2

---

## Fase 2: Testing con Dataset Actual (10 min)

- [ ] **Opción A**: Subir ventastest.txt (30 reg) via Postman
  1. POST `http://localhost:3000/import/ventas/upload`
  2. Headers: `Content-Type: multipart/form-data`
  3. File: `ventastest.txt`
  4. Verificar respuesta: `{ success: true, recordsImported: 30, errors: [] }`

- [ ] **Opción B**: Ejecutar script test
  ```bash
  node scripts/testImportacion.js
  ```

---

## Fase 3: Análisis de Rendimiento (5 min)

El endpoint o script mostrará:
```
RESULTADOS:
   Registros exitosos: 30
   Registros con error: 0
   Tiempo total: ?
   Velocidad: ? reg/seg
```

- [ ] Si tiempo < 2 min (30-40 seg) → ✅ Rendimiento normal
- [ ] Si tiempo > 2 min (>120 seg) → ⚠️ Problema de conectividad

---

## Fase 4: Decisión sobre Optimización

**Si el test toma ~60 seg (como antes):**
- Aceptable para testing
- PERO necesita optimización para producción
- → Ir a "Optimización Pragmática" abajo

**Si el test toma <10 seg:**
- ✅ El código ya está optimizado
- Puedes proceder a cargar datos reales

---

## Optimización Pragmática para Producción

Si decides optimizar ahora (Solución 2):

### Paso 1: Crear v2 del servicio
```javascript
// services/importventas-v2.js

// Al inicio del método importar():
async importar(rutaArchivo) {
    console.log('⏳ Precargando datos maestros...');
    
    const maestros = {
        proveedores: await this.proveedor.findAll(),
        megacategorias: await this.megacategoria.findAll(),
        categorias: await this.categoria.findAll(),
        // ... etc
    };
    
    // Convertir a Maps para O(1) lookup
    const mapMegacat = new Map(
        maestros.megacategorias.map(m => [m.nombre?.trim(), m])
    );
    
    // Luego en procesarFila, usar: mapMegacat.get(nombre)
}
```

### Paso 2: Testear
```bash
time node scripts/testImportacion.js
```

Debería reducir de 61s → ~5-10s

### Paso 3: Deploy
```bash
cp services/importventas.js services/importventas.js.backup
cp services/importventas-v2.js services/importventas.js
```

---

## Comandos Útiles

```bash
# Ver logs de importación
npm run dev

# Verificar migración
npm run db:migrate:status

# Resetear datos (⚠️ borra todo)
npm run db:drop && npm run db:migrate && npm run db:seed

# Test rápido
node scripts/testImportacion.js

# Test con timing
time node scripts/testImportacion.js
```

---

## Estado Actual

✅ Código correctamente mapeado  
✅ Migraciones aplicadas  
✅ Endpoint funcional  
⏳ A la espera de: Prueba con datos reales

---

**¿Qué quieres hacer primero?**
1. Verificar que los mapeos funcionan (Fase 1)
2. Probar importación (Fase 2)
3. Optimizar si es necesario (Fase 4)
