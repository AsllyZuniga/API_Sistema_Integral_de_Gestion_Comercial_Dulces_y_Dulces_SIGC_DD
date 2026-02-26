const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    name: {
      type: DataTypes.CHAR(255),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "name",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "SequelizeMeta",
    comment: "",
    indexes: []
  };
  const SequelizeMetaModel = sequelize.define("SequelizeMeta_model", attributes, options);
  return SequelizeMetaModel;
};