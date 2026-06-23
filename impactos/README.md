# 📦 Respaldo del endpoint `/vendedor/con-items-comprados`

## 📅 Fecha del respaldo
`2026-06-23`

## 🎯 Razón
Antes de ajustar el endpoint para que filtre vendedores, clientes e items **únicamente dentro del rango de fechas** seleccionado, se guarda una copia del comportamiento anterior, en el cual los vendedores y clientes podían aparecer con `totalCompras: 0` e `items: []` si tenían ventas históricas (en cualquier mes/año) pero no en el rango consultado.

## 📁 Archivos respaldados

| Archivo original | Respaldo |
|---|---|
| `services/vendedorService.js` | `impactos/services/vendedorService.js.backup` |
| `controllers/vendedorController.js` | `impactos/controllers/vendedorController.js.backup` |
| `routes/vendedorRouter.js` | `impactos/routes/vendedorRouter.js.backup` |

## 🔄 Diferencia clave con la versión actual

### Versión respaldada (v1.3.0)
- **Vendedores sin ventas en el rango**: aparecen con clientes históricos
- **Clientes sin compras en el rango**: aparecen con `totalCompras: 0` e `items: []`
- **Sin fechas**: trae todos los vendedores y sus clientes históricos

### Versión actual (v1.4.0+)
- **Vendedores sin ventas en el rango**: NO aparecen
- **Clientes sin compras en el rango**: NO aparecen (porque el JOIN incluye filtro de fecha)
- **Items**: solo los del rango (igual que v1.3.0)
- **Sin fechas**: mantiene comportamiento v1.3.0 (compatibilidad)

## 🔧 Cómo restaurar (si se necesita)

```bash
# Restaurar archivos
cp impactos/services/vendedorService.js.backup services/vendedorService.js
cp impactos/controllers/vendedorController.js.backup controllers/vendedorController.js
cp impactos/routes/vendedorRouter.js.backup routes/vendedorRouter.js
```

## ⚠️ Notas
- Este respaldo es **solo referencia documental**, no se monta en el router
- Los archivos `.backup` NO se ejecutan, solo se preservan en disco
- Si se restaura, también debe revertirse la documentación (`ENDPOINT_VENDEDOR_ITEMS.md` y `GUIA_POSTMAN_VENDEDORES_ITEMS.md`)
