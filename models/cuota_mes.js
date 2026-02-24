const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_inicio",
      autoIncrement: false
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_fin",
      autoIncrement: false
    },
    id_vendedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_vendedor",
      autoIncrement: false,
      references: {
        key: "id",
        model: "vendedores_model"
      }
    },
    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_producto",
      autoIncrement: false,
      references: {
        key: "id",
        model: "productos_model"
      }
    }
  };
  const options = {
    tableName: "cuota_mes",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const CuotaMesModel = sequelize.define("cuota_mes_model", attributes, options);
  return CuotaMesModel;
};