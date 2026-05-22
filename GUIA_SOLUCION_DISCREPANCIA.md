# 🛠️ GUÍA DE SOLUCIÓN - Discrepancia de Cuotas Vendedor 0550

## Resumen Rápido

**Problema**: Frontend muestra $0 para 19 de 33 líneas de negocio del vendedor 0550.

**Causa**: La tabla `vendedorCuotaCategoria` donde el Frontend busca los datos **NO EXISTE en la BD**.

**Solución**: Elegir entre 3 opciones según prioridades.

---

## 🎯 OPCIÓN 1: Crear la Tabla Faltante (RÁPIDA - 2 horas)

### Pros:
- ✅ Implementación rápida
- ✅ Código Frontend listo para usar
- ✅ Mínimos cambios en controllers/services

### Contras:
- ❌ Mantiene sistema de dos vías (duplicación de datos)
- ❌ Requiere mantener sincronización entre proveedor y categoría

### Pasos:

#### 1. Crear la Migración

```bash
npx sequelize-cli migration:generate --name create-vendedor-cuota-categoria
```

Archivo generado: `migrations/[timestamp]-create-vendedor-cuota-categoria.js`

```javascript
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('vendedorCuotaCategoria', {
            id_vendedor_cuota_categoria: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            id_vendedor: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'vendedor',
                    key: 'id_vendedor'
                }
            },
            id_categoria: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'categoria',
                    key: 'id_categoria'
                }
            },
            cuota: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0
            },
            fecha_inicio: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            fecha_fin: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            estado: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now')
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now')
            }
        });

        // Crear índices
        await queryInterface.addIndex('vendedorCuotaCategoria', ['id_vendedor']);
        await queryInterface.addIndex('vendedorCuotaCategoria', ['id_categoria']);
        await queryInterface.addIndex('vendedorCuotaCategoria', 
            ['id_vendedor', 'id_categoria'], 
            { unique: true, name: 'uq_vendedor_categoria_cuota' }
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('vendedorCuotaCategoria');
    }
};
```

#### 2. Crear Script de Migración de Datos

Archivo: `scripts/migrate-proveedor-to-categoria.js`

```javascript
const { Sequelize } = require('sequelize');
const fs = require('fs');
const models = require('../models');

// Mapeo manual de Proveedor → Categoría
const MAPEO_PROVEEDOR_CATEGORIA = {
    'ARCOR': '020',
    'TONING': '220',
    'INCODEPF': '070',
    'ITALO': '130',
    'ALICORP ALIMENTOS': '110',
    'CONFITECA': '100',
    'FLORA FOOD': '273',
    'EL REY': '230',
    'LEVAPAN': '240',
    'SUPER': '030',
    'HENKEL': '640',
    'RECAMIER': '690',
    'PREBEL': '630',
    'ENERGIZER': '880',
    'COFARMA': '875', // LAB. COFARMA
    'SAN JORGE VELAS Y VELONES': '860',
    'BELLEZA EXPRESS': '625',
    'LA CORUÑA': '290',
    'KATORI': '873',
    'SIEGFRIED': '540',
    'BAYER': '523',
    'HALEON': '525',
    'MONDELEZ': '040',
    'ALDOR': '080',
    'FONANDES': '900',
    'DANISCO': '277',
    'CALA': '806',
    'JOHNSON Y JOHNSON': '620',
    'SANUSS': '805',
    'KELLOGG': '280', // KELLOGGS
    'MULTIDIMENSIONALES': '890',
    'LAB. OSA': '520',
    'FINI': '190'
};

async function migrateData() {
    try {
        console.log('Iniciando migración de Proveedor → Categoría...\n');

        // Para cada combinación vendedor-proveedor en vendedorCuotaProveedor
        const vendedorCuotasProveedor = await models.VendedorCuotaProveedor.findAll({
            include: [
                { model: models.Proveedor, attributes: ['nombre'] },
                { model: models.CuotaProveedor, attributes: ['cuota', 'fecha_inicio', 'fecha_fin'] }
            ]
        });

        let creadas = 0;
        let errores = 0;

        for (const vcp of vendedorCuotasProveedor) {
            try {
                const nombreProveedor = vcp.Proveedor.nombre;
                const idCategoria = MAPEO_PROVEEDOR_CATEGORIA[nombreProveedor];

                if (!idCategoria) {
                    console.log(`⚠️  Proveedor no mapeado: ${nombreProveedor}`);
                    continue;
                }

                // Verificar si ya existe
                const existe = await models.VendedorCuotaCategoria.findOne({
                    where: {
                        id_vendedor: vcp.id_vendedor,
                        id_categoria: idCategoria
                    }
                });

                if (existe) {
                    // Actualizar con cuota más reciente
                    await existe.update({ cuota: vcp.CuotaProveedor.cuota });
                } else {
                    // Crear nuevo registro
                    await models.VendedorCuotaCategoria.create({
                        id_vendedor: vcp.id_vendedor,
                        id_categoria: idCategoria,
                        cuota: vcp.CuotaProveedor.cuota,
                        fecha_inicio: vcp.CuotaProveedor.fecha_inicio,
                        fecha_fin: vcp.CuotaProveedor.fecha_fin
                    });
                }

                creadas++;
            } catch (err) {
                console.error(`Error al migrar: ${err.message}`);
                errores++;
            }
        }

        console.log(`\n✅ Migración completada`);
        console.log(`   • Registros creados/actualizados: ${creadas}`);
        console.log(`   • Errores: ${errores}`);

    } catch (error) {
        console.error('Error crítico:', error);
    } finally {
        process.exit(0);
    }
}

migrateData();
```

#### 3. Ejecutar Migración

```bash
# Crear tabla
npx sequelize-cli db:migrate

# Migrar datos
node scripts/migrate-proveedor-to-categoria.js
```

#### 4. Verificar Resultados

```bash
# En BD SQL
SELECT COUNT(*) FROM "vendedorCuotaCategoria";
# Debería retornar: > 30 registros para vendedor 0550

# En Frontend (debe funcionar ahora)
GET /cuota-categoria/vendedor/0550
```

---

## 🚀 OPCIÓN 2: Redirigir Frontend a Tabla de Proveedores (CORRECTA - 4 horas)

### Pros:
- ✅ Una sola fuente de verdad
- ✅ No hay duplicación de datos
- ✅ Sistema más limpio a futuro

### Contras:
- ❌ Requiere cambio en servicios/controladores
- ❌ Requiere mapeo dinámico proveedor ↔ categoría

### Pasos:

#### 1. Crear Servicio de Mapeo

Archivo: `services/mapeoProveedorCategoria.js`

```javascript
const MAPEO = {
    '020': 'ARCOR',
    '220': 'TONING',
    '070': 'INCODEPF',
    // ... más mappings
};

const MAPEO_INVERSO = {};
Object.entries(MAPEO).forEach(([cat, prov]) => {
    MAPEO_INVERSO[prov.toUpperCase()] = cat;
});

exports.getCategoriaIdFromProveedor = (nombreProveedor) => {
    return MAPEO_INVERSO[nombreProveedor.toUpperCase()];
};

exports.getProveedorFromCategoriaId = (idCategoria) => {
    return MAPEO[idCategoria];
};
```

#### 2. Modificar Service de CuotaCategoria

Archivo: `services/cuotaCategoria.js` (línea ~230)

```javascript
exports.getCuotaCategoriaPorVendedor = async (idVendedor, fechaInicio, fechaFin) => {
    try {
        // YA NO BUSCA EN vendedorCuotaCategoria
        // Ahora busca en vendedorCuotaProveedor

        const cuotasProveedor = await sequelize.query(`
            SELECT 
                p.nombre,
                MAX(cp.cuota) AS cuota,  -- Última cuota (para ese período)
                cp.fecha_inicio,
                cp.fecha_fin
            FROM "vendedorCuotaProveedor" vcp
            JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
            JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
            WHERE vcp.id_vendedor = :idVendedor
                AND cp.fecha_fin >= :fechaInicio
                AND cp.fecha_inicio <= :fechaFin
            GROUP BY p.nombre, cp.fecha_inicio, cp.fecha_fin
        `, {
            replacements: { idVendedor, fechaInicio, fechaFin },
            type: Sequelize.QueryTypes.SELECT
        });

        // Mapear proveedor → categoría
        return cuotasProveedor.map(row => ({
            id_categoria: mapeoProveedorCategoria.getCategoriaIdFromProveedor(row.nombre),
            nombre: row.nombre,
            cuota: row.cuota,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin
        }));

    } catch (error) {
        throw error;
    }
};
```

---

## ⚡ OPCIÓN 3: Solución Rápida Temporal (1 hora)

Si necesitas un fix INMEDIATO mientras se desarrolla la solución permanente:

#### Crear Endpoint Temporal

Archivo: `routes/cuotaCategoriaRouter.js`

```javascript
router.get('/vendedor/:id', async (req, res) => {
    try {
        const idVendedor = req.params.id;
        
        // WORKAROUND TEMPORAL: buscar en proveedor en lugar de categoría
        const cuotas = await sequelize.query(`
            SELECT 
                p.nombre as categoria,
                MAX(cp.cuota) as cuota
            FROM "vendedorCuotaProveedor" vcp
            JOIN proveedor p ON p.id_proveedor = vcp.id_proveedor
            JOIN "cuotaProveedor" cp ON cp."id_cuotaProveedor" = vcp."id_cuotaProveedor"
            WHERE vcp.id_vendedor = ${idVendedor}
            GROUP BY p.nombre
        `);

        res.json({ success: true, data: cuotas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

---

## 🔍 VERIFICACIÓN POST-SOLUCIÓN

Ejecutar este script después de implementar cualquier solución:

```bash
node verify_vendedor_0550.js

# Debe mostrar:
# ✅ Vendedor encontrado: CAMPO SAMBONI FAIBER DURLEY
# ✅ Cuotas en vendedorCuotaCategoria: 33 encontradas
# ✓ TONING: $12,828,309
# ✓ ARCOR: $1,735,046  ← ANTES MOSTRABA $0
# ✓ FINI: $850,000     ← ANTES MOSTRABA $0
```

---

## 📊 Comparación de Opciones

| Aspecto | Opción 1 | Opción 2 | Opción 3 |
|---------|----------|----------|----------|
| **Tiempo** | 2 horas | 4 horas | 1 hora |
| **Complejidad** | Baja | Media | Muy Baja |
| **Calidad** | Regular | Excelente | Pobre |
| **Permanencia** | Permanente | Permanente | Temporal |
| **Deuda Técnica** | Sí (duplicación) | No | Sí (bandaid) |
| **Recomendación** | OK si presión | **MEJOR** | Emergencia |

---

## 🎯 RECOMENDACIÓN FINAL

**Usar OPCIÓN 1 (Crear tabla) como SOLUCIÓN INMEDIATA** (2-3 horas)

Luego planificar **OPCIÓN 2 (Redirigir al sistema correcto)** para refactorización futura (próximo sprint).

Esto te da:
1. ✅ Fix inmediato
2. ✅ Sistema funcional
3. ✅ Camino hacia arquitectura correcta

