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