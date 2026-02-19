const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.CHAR(20),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo",
      autoIncrement: false,
      unique: "unidades_medida_codigo_key",
    },
  };
  const options = {
    tableName: "unidades_medida",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: "public",
  };
  const UnidadesMedidaModel = sequelize.define(
    "unidades_medida_model",
    attributes,
    options,
  );
  return UnidadesMedidaModel;
};
