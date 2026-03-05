const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_obsequio: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_obsequio",
      autoIncrement: true
    },
    descripcion: {
      type: DataTypes.CHAR,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "descripcion",
      autoIncrement: false
    },
    valor_obsequio: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_obsequio",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "obsequio",
    comment: "",
    indexes: []
  };
  const ObsequioModel = sequelize.define("obsequio_model", attributes, options);
  return ObsequioModel;
};