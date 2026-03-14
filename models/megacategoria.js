const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_megacategoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_megacategoria",
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
    tableName: "megacategoria",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const MegacategoriaModel = sequelize.define("megacategoria_model", attributes, options);
  return MegacategoriaModel;
};