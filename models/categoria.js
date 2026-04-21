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
      type: DataTypes.DECIMAL(15,2),
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
const _categoriaFactory = module.exports;

module.exports = (sequelize) => {
  const CategoriaModel = _categoriaFactory(sequelize);

  CategoriaModel.removeAttribute('cuota');

  CategoriaModel.rawAttributes.nombre.type = DataTypes.STRING(150);
  CategoriaModel.rawAttributes.fecha_inicio.type = DataTypes.DATEONLY;
  CategoriaModel.rawAttributes.fecha_fin.type = DataTypes.DATEONLY;

  CategoriaModel.rawAttributes.id_cuota_categoria = {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: null,
    field: 'id_cuota_categoria',
    references: {
      model: 'cuotaCategoria_model',
      key: 'id_cuota_categoria'
    }
  };

  CategoriaModel.refreshAttributes();

  return CategoriaModel;
};