const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_ciudad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_ciudad",
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "ciudad",
    comment: "",
    indexes: []
  };
  const CiudadModel = sequelize.define("ciudad_model", attributes, options);
  return CiudadModel;
};