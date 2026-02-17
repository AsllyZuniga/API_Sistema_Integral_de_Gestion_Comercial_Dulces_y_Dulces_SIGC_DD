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
    codigo: {
      type: DataTypes.CHAR(30),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo",
      autoIncrement: false,
      unique: "productos_codigo_key"
    },
    descripcion: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "descripcion",
      autoIncrement: false
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "categoria_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "categorias_model"
      }
    }
  };
  const options = {
    tableName: "productos",
    comment: "",
    indexes: []
  };
  const ProductosModel = sequelize.define("productos_model", attributes, options);
  return ProductosModel;
};