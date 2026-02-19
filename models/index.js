"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];

const db = {};
let sequelize;

// Crear instancia de Sequelize según configuración
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// --------------------------------------------------
// Carga automática de todos los modelos del directorio
// --------------------------------------------------
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// --------------------------------------------------
// Definición de relaciones entre modelos
// --------------------------------------------------

const Categorias = db.categorias_model;
const Productos = db.productos_model;
const Clientes = db.clientes_model;
const Vendedores = db.vendedores_model;
const TiposDocumento = db.tipos_documento_model;
const UnidadesMedida = db.unidades_medida_model;
const Ventas = db.ventas_model;
const VentasDetalle = db.ventas_detalle_model;
const CuotasVendedores = db.cuotas_vendedores_model;

/*
  Categorias 1:N Productos
  productos.categoria_id -> categorias.id
*/
Categorias.hasMany(Productos, {
  foreignKey: "categoria_id",
  as: "productos",
});
Productos.belongsTo(Categorias, {
  foreignKey: "categoria_id",
  as: "categoria",
});

/*
  Clientes 1:N Ventas
  ventas.cliente_id -> clientes.id
*/
Clientes.hasMany(Ventas, {
  foreignKey: "cliente_id",
  as: "ventas",
});
Ventas.belongsTo(Clientes, {
  foreignKey: "cliente_id",
  as: "cliente",
});

/*
  Vendedores 1:N Ventas
  ventas.vendedor_id -> vendedores.id
*/
Vendedores.hasMany(Ventas, {
  foreignKey: "vendedor_id",
  as: "ventas",
});
Ventas.belongsTo(Vendedores, {
  foreignKey: "vendedor_id",
  as: "vendedor",
});

/*
  TiposDocumento 1:N Ventas
  ventas.tipo_documento_id -> tipos_documento.id
*/
TiposDocumento.hasMany(Ventas, {
  foreignKey: "tipo_documento_id",
  as: "ventas",
});
Ventas.belongsTo(TiposDocumento, {
  foreignKey: "tipo_documento_id",
  as: "tipo_documento",
});

/*
  Ventas 1:N VentasDetalle
  ventas_detalle.venta_id -> ventas.id
*/
Ventas.hasMany(VentasDetalle, {
  foreignKey: "venta_id",
  as: "detalle",
});
VentasDetalle.belongsTo(Ventas, {
  foreignKey: "venta_id",
  as: "venta",
});

/*
  Productos 1:N VentasDetalle
  ventas_detalle.producto_id -> productos.id
*/
Productos.hasMany(VentasDetalle, {
  foreignKey: "producto_id",
  as: "detalles",
});
VentasDetalle.belongsTo(Productos, {
  foreignKey: "producto_id",
  as: "producto",
});

/*
  UnidadesMedida 1:N VentasDetalle
  ventas_detalle.unidad_medida_id -> unidades_medida.id
*/
UnidadesMedida.hasMany(VentasDetalle, {
  foreignKey: "unidad_medida_id",
  as: "detalles",
});
VentasDetalle.belongsTo(UnidadesMedida, {
  foreignKey: "unidad_medida_id",
  as: "unidad_medida",
});

/*
  Vendedores 1:N CuotasVendedores
  cuotas_vendedores.vendedor_id -> vendedores.id
*/
Vendedores.hasMany(CuotasVendedores, {
  foreignKey: "vendedor_id",
  as: "cuotas",
});
CuotasVendedores.belongsTo(Vendedores, {
  foreignKey: "vendedor_id",
  as: "vendedor",
});

// --------------------------------------------------
// Exportación
// --------------------------------------------------
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
