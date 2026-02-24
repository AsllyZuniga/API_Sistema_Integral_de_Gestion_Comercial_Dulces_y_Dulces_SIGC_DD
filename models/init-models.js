
var DataTypes = require("sequelize").DataTypes;
var Categorias = require("./categorias.js");
var Productos = require("./productos.js");
var Clientes = require("./clientes.js");
var Vendedores = require("./vendedores.js");
var TiposDocumento = require("./tipos_documento.js");
var UnidadesMedida = require("./unidades_medida.js");
var Ventas = require("./ventas.js");
var VentasDetalle = require("./ventas_detalle.js");
var CuotasVendedores = require("./cuotas_vendedores.js");

function initModels(sequelize) {
  const categorias_model = Categorias(sequelize);
  const productos_model = Productos(sequelize);
  const clientes_model = Clientes(sequelize);
  const vendedores_model = Vendedores(sequelize);
  const tipos_documento_model = TiposDocumento(sequelize);
  const unidades_medida_model = UnidadesMedida(sequelize);
  const ventas_model = Ventas(sequelize);
  const ventas_detalle_model = VentasDetalle(sequelize);
  const cuotas_vendedores_model = CuotasVendedores(sequelize);

  // Relaciones
  categorias_model.hasMany(productos_model, { foreignKey: "categoria_id", as: "productos" });
  productos_model.belongsTo(categorias_model, { foreignKey: "categoria_id", as: "categoria" });

  clientes_model.hasMany(ventas_model, { foreignKey: "cliente_id", as: "ventas" });
  ventas_model.belongsTo(clientes_model, { foreignKey: "cliente_id", as: "cliente" });

  vendedores_model.hasMany(ventas_model, { foreignKey: "vendedor_id", as: "ventas" });
  ventas_model.belongsTo(vendedores_model, { foreignKey: "vendedor_id", as: "vendedor" });

  tipos_documento_model.hasMany(ventas_model, { foreignKey: "tipo_documento_id", as: "ventas" });
  ventas_model.belongsTo(tipos_documento_model, { foreignKey: "tipo_documento_id", as: "tipo_documento" });

  ventas_model.hasMany(ventas_detalle_model, { foreignKey: "venta_id", as: "detalle" });
  ventas_detalle_model.belongsTo(ventas_model, { foreignKey: "venta_id", as: "venta" });

  productos_model.hasMany(ventas_detalle_model, { foreignKey: "producto_id", as: "detalles" });
  ventas_detalle_model.belongsTo(productos_model, { foreignKey: "producto_id", as: "producto" });

  unidades_medida_model.hasMany(ventas_detalle_model, { foreignKey: "unidad_medida_id", as: "detalles" });
  ventas_detalle_model.belongsTo(unidades_medida_model, { foreignKey: "unidad_medida_id", as: "unidad_medida" });

  vendedores_model.hasMany(cuotas_vendedores_model, { foreignKey: "vendedor_id", as: "cuotas" });
  cuotas_vendedores_model.belongsTo(vendedores_model, { foreignKey: "vendedor_id", as: "vendedor" });

  return {
    categorias_model,
    productos_model,
    clientes_model,
    vendedores_model,
    tipos_documento_model,
    unidades_medida_model,
    ventas_model,
    ventas_detalle_model,
    cuotas_vendedores_model
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
