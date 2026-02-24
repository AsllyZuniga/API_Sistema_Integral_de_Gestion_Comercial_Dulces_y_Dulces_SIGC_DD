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
    categoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "categoria",
      autoIncrement: false
    },
    megacategoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "megacategoria",
      autoIncrement: false
    },
    subcategoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subcategoria",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "categorias",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'

  };
  const CategoriasModel = sequelize.define("categorias_model", attributes, options);
  return CategoriasModel;
};