const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_usuario",
      autoIncrement: true
    },
    username: {
      type: DataTypes.CHAR(100),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "username",
      autoIncrement: false,
      unique: "usuario_username_key"
    },
    password: {
      type: DataTypes.CHAR(255),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "password",
      autoIncrement: false
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "estado",
      autoIncrement: false
    },
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_rol",
      autoIncrement: false,
      references: {
        key: "id_rol",
        model: "rol_model"
      }
    }
  };
  const options = {
    tableName: "usuario",
    comment: "",
    indexes: []
  };
  const UsuarioModel = sequelize.define("usuario_model", attributes, options);
  return UsuarioModel;
};