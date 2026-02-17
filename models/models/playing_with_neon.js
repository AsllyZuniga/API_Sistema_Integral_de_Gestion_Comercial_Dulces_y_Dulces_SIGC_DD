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
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "name",
      autoIncrement: false
    },
    value: {
      type: DataTypes.REAL,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "value",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "playing_with_neon",
    comment: "",
    indexes: []
  };
  const PlayingWithNeonModel = sequelize.define("playing_with_neon_model", attributes, options);
  return PlayingWithNeonModel;
};