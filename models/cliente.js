const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_cliente",
      autoIncrement: true
    },
    nro_documento: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nro_documento",
      autoIncrement: false
    },
    razon_social: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "razon_social",
      autoIncrement: false
    },
    sucursal: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sucursal",
      autoIncrement: false
    },
    direccion: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "direccion",
      autoIncrement: false
    },
    nombre_establecimiento: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre_establecimiento",
      autoIncrement: false
    },
    condicion_pago: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "condicion_pago",
      autoIncrement: false
    },
    id_ciudad: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_ciudad",
      autoIncrement: false,
      references: {
        key: "id_ciudad",
        model: "ciudad_model"
      }
    },
    id_barrio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_barrio",
      autoIncrement: false,
      references: {
        key: "id_barrio",
        model: "barrio_model"
      }
    },
    id_tipo_negocio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_tipo_negocio",
      autoIncrement: false,
      references: {
        key: "id_tipo_negocio",
        model: "tipo_negocio_model"
      }
    }
  };
  const options = {
    tableName: "cliente",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const ClienteModel = sequelize.define("cliente_model", attributes, options);
  return ClienteModel;
};