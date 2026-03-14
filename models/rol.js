const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "rol_id",
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.CHAR(50),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
      autoIncrement: false,
      unique: "rol_nombre_key"
    }
  };
  const options = {
    tableName: "rol",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const RolModel = sequelize.define("rol_model", attributes, options);
  return RolModel;
};