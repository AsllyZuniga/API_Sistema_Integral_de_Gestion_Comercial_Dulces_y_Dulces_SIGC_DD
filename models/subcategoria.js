const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_subcategoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_subcategoria",
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
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_categoria",
      autoIncrement: false,
      references: {
        key: "id_categoria",
        model: "categoria_model"
      }
    }
  };
  const options = {
    tableName: "subcategoria",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const SubcategoriaModel = sequelize.define("subcategoria_model", attributes, options);
  return SubcategoriaModel;
};