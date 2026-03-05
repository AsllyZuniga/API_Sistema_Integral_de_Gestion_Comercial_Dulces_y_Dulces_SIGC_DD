const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_subcanal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_subcanal",
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
    id_canal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_canal",
      autoIncrement: false,
      references: {
        key: "id_canal",
        model: "canal_model"
      }
    }
  };
  const options = {
    tableName: "subcanal",
    comment: "",
    indexes: [],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const SubcanalModel = sequelize.define("subcanal_model", attributes, options);
  return SubcanalModel;
};