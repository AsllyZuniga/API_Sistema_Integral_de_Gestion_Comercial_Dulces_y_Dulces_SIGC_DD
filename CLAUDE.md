# CLAUDE.md - Contexto del Proyecto

## 📋 Descripción del Proyecto

**API Sistema Integral de Gestión Comercial - Dulces y Dulces (SIGC-DD)**

Sistema backend para gestión comercial com entidades como ventas, clientes, productos, proveedores, cuotas, vendedores, etc.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL/MariaDB (Sequelize ORM)
- **Authentication**: JWT (Token Bearer)
- **Testing**: Postman (colecciones incluidas)

---

## 📁 Estructura del Proyecto

```
project-root/
├── app.js                 # Punto de entrada principal
├── package.json           # Dependencias del proyecto
├── config/
│   ├── config.json        # Configuración de BD y entorno
│   └── database.js        # Conexión Sequelize
├── controllers/           # Lógica de negocio por entidad
├── models/                # Modelos Sequelize (BD)
├── routes/                # Rutas API
├── middlewares/           # Autenticación JWT
├── migrations/            # Cambios de BD
├── services/              # Servicios auxiliares
├── utils/                 # Funciones utilitarias
└── postman/               # Colecciones Postman
```

---

## 🔑 Entidades Principales

### Modelos Base

- **usuario** - Usuarios del sistema
- **cliente** - Clientes de ventas
- **vendedor** - Equipo de ventas
- **item/producto** - Catálogo de productos

### Módulo de Ventas

- **venta** - Registro de transacciones
- **detalle_venta** - Items por venta
- **linea** - Categorización de ventas

### Módulo de Cuotas

- **cuotaCategoria** - Cuota por categoría
- **cuotaMes** - Cuota mensual
- **cuotaSemana** - Cuota semanal
- **cuotaDia** - Cuota diaria
- **cuotaProveedor** - Cuota por proveedor

### Módulo Administrativo

- **proveedor** - Proveedores
- **categoria** - Categorías de productos
- **subcategoria** - Subcategorías
- **megacategoria** - Agrupación superior
- **canal** - Canales de venta
- **subcanal** - Subcanales
- **ciudad** - Ciudades
- **barrio** - Barrios
- **rol** - Roles del sistema
- **tipo_negocio** - Tipos de negocio del cliente

---

## 🚀 Instalación y Ejecución

### Setup Inicial

```bash
npm install
cp config/config.example.json config/config.json
# Editar config/config.json con credenciales BD
```

### Desarrollo

```bash
npm start          # Inicia servidor (puerto en config)
npm run dev        # Con nodemon (si está configurado)
```

### Migraciones BD

```bash
npx sequelize-cli db:migrate           # Ejecutar migrations
npx sequelize-cli db:migrate:undo:all  # Revertir todas
npx sequelize-cli migration:generate   # Crear nueva migration
```

---

## 🔐 Autenticación

- **Tipo**: JWT Bearer Token
- **Header requerido**: `Authorization: Bearer <token>`
- **Middleware**: `authJwtMiddleware.js`
- **Rutas públicas**: Login/Registro (validar en cada controlador)

---

## 📡 Convenciones de API

### Patrones de Controlador

```javascript
// controllers/namedController.js
exports.findAll = async (req, res) => {
  /* GET */
};
exports.findById = async (req, res) => {
  /* GET por ID */
};
exports.create = async (req, res) => {
  /* POST */
};
exports.update = async (req, res) => {
  /* PUT */
};
exports.delete = async (req, res) => {
  /* DELETE */
};
```

### Respuestas Estándar

- **Éxito**: `{ success: true, data: {...}, message: "..." }`
- **Error**: `{ success: false, error: "...", statusCode: 400 }`

---

## 🔄 Relaciones de Modelos Importantes

### Ventas

- `venta` → `detalle_venta` (1:N)
- `venta` → `vendedor` (N:1)
- `venta` → `cliente` (N:1)
- `detalle_venta` → `item` (N:1)

### Cuotas

- `vendedor` → `cuotaProveedor` (1:N)
- `categoria` → `cuotaCategoria` (1:N)
- `cuotaCategoria` → `cuotaMes/cuotaSemana/cuotaDia` (1:N)

---

## 📋 Variables de Entorno Requeridas

En `config/config.json`:

```json
{
  "development": {
    "database": "nombre_bd",
    "username": "usuario",
    "password": "contraseña",
    "host": "localhost",
    "dialect": "mysql",
    "port": 3306
  },
  "port": 3000
}
```

---

## 🛠️ Comandos Útiles

```bash
# Ver estado del servidor
curl http://localhost:3000/health

# Importar datos (si existe endpoint)
POST /api/import -H "Authorization: Bearer <token>"

# Exportar datos
GET /api/export -H "Authorization: Bearer <token>"
```

---

## 📌 Cosas Importantes a Recordar

1. **Siempre validar JWT** antes de acceder a datos protegidos
2. **Usar transacciones** en operaciones que tocan múltiples tablas
3. **Validar entrada** en controllers antes de BD
4. **Manejar errores** con try-catch y retornar mensajes claros
5. **Migraciones** deben ser reversibles
6. **No modificar** el schema sin agregar migration

---

## 🔗 Recursos Importantes

- **Postman Collections**: `/postman/` - Importar para testing
- **Guías**: Revisar archivos GUIA*RAPIDA*\*.md
- **Config grandes archivos**: Ver CONFIG_ARCHIVOS_GIGANTES.md para imports masivos
- **Modelos relaciones**: Ver /memories/repo/sequelize-relaciones.md

---

## 💡 Cómo Trabajar con Claude

**Para mejor asistencia, provee**:

1. El controlador o modelo relacionado
2. El error exacto (stack trace)
3. Qué intentas lograr
4. Qué has probado ya

**Comandos útiles para pedir ayuda**:

- "¿Cómo creo un endpoint que...?"
- "Ayuda con esta relación de modelos"
- "¿Qué falta en la migración?"
- "Debug de error en controlador X"
