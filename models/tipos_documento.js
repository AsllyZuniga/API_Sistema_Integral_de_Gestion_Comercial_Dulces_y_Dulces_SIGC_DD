const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.CHAR(10),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo",
      autoIncrement: false,
      unique: "tipos_documento_codigo_key"
    },
    descripcion: {
      type: DataTypes.CHAR(100),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "descripcion",
      autoIncrement: false
    },
    afecta_venta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "afecta_venta",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "tipos_documento",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const TiposDocumentoModel = sequelize.define("tipos_documento_model", attributes, options);
  return TiposDocumentoModel;
};