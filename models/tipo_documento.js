const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_tipo_documento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_tipo_documento",
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.CHAR(100),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false
    },
    consecutivo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "consecutivo",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "tipo_documento",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const TipoDocumentoModel = sequelize.define("tipo_documento_model", attributes, options);
  return TipoDocumentoModel;
};