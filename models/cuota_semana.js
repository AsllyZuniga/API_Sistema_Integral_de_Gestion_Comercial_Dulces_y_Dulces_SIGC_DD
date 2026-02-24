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
      autoIncrement: false
    },
    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_producto",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "cuota_semana",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const CuotaSemanaModel = sequelize.define("cuota_semana_model", attributes, options);
  return CuotaSemanaModel;
};