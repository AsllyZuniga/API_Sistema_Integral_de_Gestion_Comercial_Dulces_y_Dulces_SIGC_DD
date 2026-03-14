const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_vendedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_vendedor",
      autoIncrement: true
    },
    codigo_vendedor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo_vendedor",
      autoIncrement: false,
      unique: "vendedor_codigo_vendedor_key"
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_usuario",
      autoIncrement: false,
      unique: "vendedor_id_usuario_key",
      references: {
        key: "id_usuario",
        model: "usuario"
      }
    },
    id_cuotaMes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuotaMes",
      autoIncrement: false,
      references: {
        key: "id_cuotaMes",
        model: "cuotaMes"
      }
    },
    id_cuotaSemana: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuotaSemana",
      autoIncrement: false,
      references: {
        key: "id_cuotaSemana",
        model: "cuotaSemana"
      }
    },
    id_cuotaDia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cuotaDia",
      autoIncrement: false,
      references: {
        key: "id_cuotaDia",
        model: "cuotaDia"
      }
    }
  };
  const options = {
    tableName: "vendedor",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const VendedorModel = sequelize.define("vendedor_model", attributes, options);
  return VendedorModel;
};