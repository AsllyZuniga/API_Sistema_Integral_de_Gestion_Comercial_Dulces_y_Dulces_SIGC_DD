const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_barrio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_barrio",
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre",
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
    }
  };
  const options = {
    tableName: "barrio",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const BarrioModel = sequelize.define("barrio_model", attributes, options);
  return BarrioModel;
};