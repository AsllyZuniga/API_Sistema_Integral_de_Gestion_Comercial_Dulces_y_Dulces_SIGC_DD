const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_tipo_negocio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_tipo_negocio",
      autoIncrement: true
    },
    tipo_negocio: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tipo_negocio",
      autoIncrement: false
    },
    detalle_tipo_negocio: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "detalle_tipo_negocio",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "tipo_negocio",
    comment: "",
    indexes: []
  };
  const TipoNegocioModel = sequelize.define("tipo_negocio_model", attributes, options);
  return TipoNegocioModel;
};