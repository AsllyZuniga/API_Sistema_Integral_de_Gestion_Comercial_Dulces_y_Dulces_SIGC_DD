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
    vendedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "vendedor_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "vendedores_model",
      },
    },
    anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "anio",
      autoIncrement: false,
    },
    mes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "mes",
      autoIncrement: false,
    },
    cuota: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cuota",
      autoIncrement: false,
    },
  };
  const options = {
    tableName: "cuotas_vendedores",
    comment: "",
    indexes: [
      {
        name: "cuotas_vendedores_vendedor_id_anio_mes_key",
        unique: true,
        fields: ["vendedor_id", "anio", "mes"],
        timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema: "public",
      },
    ],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: "public",
  };
  const CuotasVendedoresModel = sequelize.define(
    "cuotas_vendedores_model",
    attributes,
    options,
  );
  return CuotasVendedoresModel;
};
