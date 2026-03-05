const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_detalle: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_detalle",
      autoIncrement: true
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_venta",
      autoIncrement: false,
      references: {
        key: "id_venta",
        model: "venta_model"
      }
    },
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_item",
      autoIncrement: false,
      references: {
        key: "id_item",
        model: "item_model"
      }
    },
    cantidad_emp: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cantidad_emp",
      autoIncrement: false
    },
    cantidad: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cantidad",
      autoIncrement: false
    },
    precio_unitario: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "precio_unitario",
      autoIncrement: false
    },
    descuento: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "descuento",
      autoIncrement: false
    },
    subtotal: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subtotal",
      autoIncrement: false
    },
    costo_promedio_total: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "costo_promedio_total",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "detalle_venta",
    comment: "",
    indexes: []
  };
  const DetalleVentaModel = sequelize.define("detalle_venta_model", attributes, options);
  return DetalleVentaModel;
};