const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  dialectOptions: dbConfig.dialectOptions || {},
  logging: false, // Set to console.log to see SQL queries
});

// Import models
const barrio_model = require('./barrio')(sequelize);
const canal_model = require('./canal')(sequelize);
const categoria_model = require('./categoria')(sequelize);
const ciudad_model = require('./ciudad')(sequelize);
const cliente_model = require('./cliente')(sequelize);
const detalle_venta_model = require('./detalle_venta')(sequelize);
const item_model = require('./item')(sequelize);
const megacategoria_model = require('./megacategoria')(sequelize);
const obsequio_model = require('./obsequio')(sequelize);
const proveedor_model = require('./proveedor')(sequelize);
const rol_model = require('./rol')(sequelize);
const subcanal_model = require('./subcanal')(sequelize);
const subcategoria_model = require('./subcategoria')(sequelize);
const tipo_documento_model = require('./tipo_documento')(sequelize);
const tipo_negocio_model = require('./tipo_negocio')(sequelize);
const usuario_model = require('./usuario')(sequelize);
const vendedor_model = require('./vendedor')(sequelize);
const venta_model = require('./venta')(sequelize);

// Define associations/relationships
// Jerarquía de categorías
megacategoria_model.hasMany(categoria_model, { foreignKey: 'id_megacategoria', as: 'categorias' });
categoria_model.belongsTo(megacategoria_model, { foreignKey: 'id_megacategoria', as: 'megacategoria' });

categoria_model.hasMany(subcategoria_model, { foreignKey: 'id_categoria', as: 'subcategorias' });
subcategoria_model.belongsTo(categoria_model, { foreignKey: 'id_categoria', as: 'categoria' });

// Ubicación geográfica
ciudad_model.hasMany(barrio_model, { foreignKey: 'id_ciudad', as: 'barrios' });
barrio_model.belongsTo(ciudad_model, { foreignKey: 'id_ciudad', as: 'ciudad' });

// Canales
canal_model.hasMany(subcanal_model, { foreignKey: 'id_canal', as: 'subcanales' });
subcanal_model.belongsTo(canal_model, { foreignKey: 'id_canal', as: 'canal' });

// Usuarios y roles
rol_model.hasMany(usuario_model, { foreignKey: 'id_rol', as: 'usuarios' });
usuario_model.belongsTo(rol_model, { foreignKey: 'id_rol', as: 'rol' });

usuario_model.hasOne(vendedor_model, { foreignKey: 'id_usuario', as: 'vendedor' });
vendedor_model.belongsTo(usuario_model, { foreignKey: 'id_usuario', as: 'usuario' });

// Cliente relaciones
cliente_model.belongsTo(ciudad_model, { foreignKey: 'id_ciudad', as: 'ciudad' });
ciudad_model.hasMany(cliente_model, { foreignKey: 'id_ciudad', as: 'clientes' });

cliente_model.belongsTo(barrio_model, { foreignKey: 'id_barrio', as: 'barrio' });
barrio_model.hasMany(cliente_model, { foreignKey: 'id_barrio', as: 'clientes' });

cliente_model.belongsTo(canal_model, { foreignKey: 'id_canal', as: 'canal' });
canal_model.hasMany(cliente_model, { foreignKey: 'id_canal', as: 'clientes' });

cliente_model.belongsTo(tipo_negocio_model, { foreignKey: 'id_tipo_negocio', as: 'tipoNegocio' });
tipo_negocio_model.hasMany(cliente_model, { foreignKey: 'id_tipo_negocio', as: 'clientes' });

// Item relaciones
item_model.belongsTo(megacategoria_model, { foreignKey: 'id_megacategoria', as: 'megacategoria' });
megacategoria_model.hasMany(item_model, { foreignKey: 'id_megacategoria', as: 'items' });

item_model.belongsTo(categoria_model, { foreignKey: 'id_categoria', as: 'categoria' });
categoria_model.hasMany(item_model, { foreignKey: 'id_categoria', as: 'items' });

item_model.belongsTo(subcategoria_model, { foreignKey: 'id_subcategoria', as: 'subcategoria' });
subcategoria_model.hasMany(item_model, { foreignKey: 'id_subcategoria', as: 'items' });

item_model.belongsTo(proveedor_model, { foreignKey: 'id_proveedor', as: 'proveedor' });
proveedor_model.hasMany(item_model, { foreignKey: 'id_proveedor', as: 'items' });

item_model.belongsTo(obsequio_model, { foreignKey: 'id_obsequio', as: 'obsequio' });
obsequio_model.hasMany(item_model, { foreignKey: 'id_obsequio', as: 'items' });

// Venta relaciones
venta_model.belongsTo(tipo_documento_model, { foreignKey: 'id_tipo_documento', as: 'tipoDocumento' });
tipo_documento_model.hasMany(venta_model, { foreignKey: 'id_tipo_documento', as: 'ventas' });

venta_model.belongsTo(cliente_model, { foreignKey: 'id_cliente', as: 'cliente' });
cliente_model.hasMany(venta_model, { foreignKey: 'id_cliente', as: 'ventas' });

venta_model.belongsTo(vendedor_model, { foreignKey: 'id_vendedor', as: 'vendedor' });
vendedor_model.hasMany(venta_model, { foreignKey: 'id_vendedor', as: 'ventas' });

venta_model.belongsTo(canal_model, { foreignKey: 'id_canal', as: 'canal' });
canal_model.hasMany(venta_model, { foreignKey: 'id_canal', as: 'ventas' });

venta_model.belongsTo(subcanal_model, { foreignKey: 'id_subcanal', as: 'subcanal' });
subcanal_model.hasMany(venta_model, { foreignKey: 'id_subcanal', as: 'ventas' });

// Detalle venta relaciones
venta_model.hasMany(detalle_venta_model, { foreignKey: 'id_venta', as: 'detalles' });
detalle_venta_model.belongsTo(venta_model, { foreignKey: 'id_venta', as: 'venta' });

detalle_venta_model.belongsTo(item_model, { foreignKey: 'id_item', as: 'item' });
item_model.hasMany(detalle_venta_model, { foreignKey: 'id_item', as: 'detallesVenta' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  barrio_model,
  canal_model,
  categoria_model,
  ciudad_model,
  cliente_model,
  detalle_venta_model,
  item_model,
  megacategoria_model,
  obsequio_model,
  proveedor_model,
  rol_model,
  subcanal_model,
  subcategoria_model,
  tipo_documento_model,
  tipo_negocio_model,
  usuario_model,
  vendedor_model,
  venta_model
};