"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];

const db = {};
let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// 1. Carga automática de modelos
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// 2. Definición de Alias para facilitar la lectura
const Vendedores = db.vendedores_model;
const CuotasVendedores = db.cuotas_vendedores_model;
const CuotaMes = db.cuota_mes_model;
const Ventas = db.ventas_model;
const VentasDetalle = db.ventas_detalle_model;
const Productos = db.productos_model;
const TiposDocumento = db.tipos_documento_model;
const UnidadesMedida = db.unidades_medida_model;

// 3. RELACIONES (ASOCIACIONES) - CORREGIDAS

// Relación: Vendedores 1:N CuotasVendedores
Vendedores.hasMany(CuotasVendedores, {
  foreignKey: "vendedor_id",
  as: "cuotas", // Alias usado en el controlador
});
CuotasVendedores.belongsTo(Vendedores, {
  foreignKey: "vendedor_id",
  as: "vendedor",
});

// Relación: CuotasVendedores N:1 CuotaMes
// Esta es la conexión crítica para obtener el valor numérico de la cuota
CuotasVendedores.belongsTo(CuotaMes, {
  foreignKey: "id_cuota_mes",
  as: "cuota_mes", // Alias usado en el include anidado
});
CuotaMes.hasMany(CuotasVendedores, {
  foreignKey: "id_cuota_mes",
  as: "asignaciones",
});

// Relación: Ventas 1:N VentasDetalle
Ventas.hasMany(VentasDetalle, {
  foreignKey: "venta_id",
  as: "detalle",
});
VentasDetalle.belongsTo(Ventas, {
  foreignKey: "venta_id",
  as: "venta",
});

// Relación: Vendedores 1:N Ventas
Vendedores.hasMany(Ventas, {
  foreignKey: "vendedor_id",
  as: "ventas",
});
Ventas.belongsTo(Vendedores, {
  foreignKey: "vendedor_id",
  as: "vendedor",
});

// Relación: Productos con Detalles y Cuotas (Opcional según tu lógica)
Productos.hasMany(VentasDetalle, { foreignKey: "producto_id", as: "detalles_ventas" });
VentasDetalle.belongsTo(Productos, { foreignKey: "producto_id", as: "producto" });

// 4. Exportar la base de datos
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;