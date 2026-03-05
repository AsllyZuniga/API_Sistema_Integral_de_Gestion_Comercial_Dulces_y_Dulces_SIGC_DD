const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_proveedor: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_proveedor",
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.CHAR,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo",
      autoIncrement: false
    },
    nombre: {
      type: DataTypes.CHAR,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false
    },
    cuota: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cuota",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "proveedor",
    comment: "",
    indexes: []
  };
  const ProveedorModel = sequelize.define("proveedor_model", attributes, options);
  return ProveedorModel;
};