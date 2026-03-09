const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_categoria",
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
    id_megacategoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_megacategoria",
      autoIncrement: false,
      references: {
        key: "id_megacategoria",
        model: "megacategoria_model"
      }
    },
    cuota: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cuota",
      autoIncrement: false
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_inicio",
      autoIncrement: false
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha_fin",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "categoria",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const CategoriaModel = sequelize.define("categoria_model", attributes, options);
  return CategoriaModel;
};