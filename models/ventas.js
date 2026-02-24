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
    tipo_documento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tipo_documento_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "tipos_documento_model"
      }
    },
    numero_documento: {
      type: DataTypes.CHAR(40),
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "numero_documento",
      autoIncrement: false,
      unique: "ventas_numero_documento_key"
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha",
      autoIncrement: false
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cliente_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "clientes_model"
      }
    },
    vendedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "vendedor_id",
      autoIncrement: false,
      references: {
        key: "id",
        model: "vendedores_model"
      }
    },
    sucursal: {
      type: DataTypes.CHAR(20),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sucursal",
      autoIncrement: false
    },
    canal: {
      type: DataTypes.CHAR(120),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "canal",
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
    }
  };
  const options = {
    tableName: "ventas",
    comment: "",
    indexes: [{
      name: "idx_ventas_cliente",
      unique: false,
      fields: ["cliente_id"]
    }, {
      name: "idx_ventas_fecha",
      unique: false,
      fields: ["fecha"]
    }, {
      name: "idx_ventas_vendedor",
      unique: false,
      fields: ["vendedor_id"]
    }],
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    schema: 'public'
  };
  const VentasModel = sequelize.define("ventas_model", attributes, options);
  return VentasModel;
};