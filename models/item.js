const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_item",
      autoIncrement: true
    },
    codigo_item: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo_item",
      autoIncrement: false
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
    unidad_medida_empaque: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "unidad_medida_empaque",
      autoIncrement: false
    },
    unidad_medida_orden: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "unidad_medida_orden",
      autoIncrement: false
    },
    cantidad_empaque: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cantidad_empaque",
      autoIncrement: false
    },
    peso_kilo: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "peso_kilo",
      autoIncrement: false
    },
    factor_um_empaque: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "factor_um_empaque",
      autoIncrement: false
    },
    factor_um_orden: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "factor_um_orden",
      autoIncrement: false
    },
    id_megacategoria: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_categoria",
      autoIncrement: false,
      references: {
        key: "id_categoria",
        model: "categoria_model"
      }
    },
    id_subcategoria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_subcategoria",
      autoIncrement: false,
      references: {
        key: "id_subcategoria",
        model: "subcategoria_model"
      }
    },
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_proveedor",
      autoIncrement: false,
      references: {
        key: "id_proveedor",
        model: "proveedor_model"
      }
    },
    id_obsequio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_obsequio",
      autoIncrement: false,
      references: {
        key: "id_obsequio",
        model: "obsequio_model"
      }
    }
  };
  const options = {
    tableName: "item",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const ItemModel = sequelize.define("item_model", attributes, options);
  return ItemModel;
};