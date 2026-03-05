const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_canal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_canal",
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.CHAR(150),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "canal",
    comment: "",
    indexes: []
  };
  const CanalModel = sequelize.define("canal_model", attributes, options);
  return CanalModel;
};