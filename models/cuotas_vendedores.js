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
        model: "vendedores_model"
      }
    },
    id_cuota_anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuota_anio",
      autoIncrement: false,
      references: {
        key: "id",
        model: "cuota_anio_model"
      }
    },
    id_cuota_mes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuota_mes",
      autoIncrement: false,
      references: {
        key: "id",
        model: "cuota_mes_model"
      }
    },
    id_cuota_semana: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuota_semana",
      autoIncrement: false,
      references: {
        key: "id",
        model: "cuota_semana_model"
      }
    },
    id_cuota_dia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuota_dia",
      autoIncrement: false,
      references: {
        key: "id",
        model: "cuota_dia_model"
      }
    }
  };
  const options = {
    tableName: "cuotas_vendedores",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const CuotasVendedoresModel = sequelize.define("cuotas_vendedores_model", attributes, options);
  return CuotasVendedoresModel;
};