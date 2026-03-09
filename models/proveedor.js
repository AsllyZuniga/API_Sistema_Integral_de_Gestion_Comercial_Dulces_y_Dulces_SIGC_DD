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
      allowNull: true,
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
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cuota",
      autoIncrement: false
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_inicio",
      autoIncrement: false
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_fin",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "proveedor",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const ProveedorModel = sequelize.define("proveedor_model", attributes, options);
  return ProveedorModel;
};