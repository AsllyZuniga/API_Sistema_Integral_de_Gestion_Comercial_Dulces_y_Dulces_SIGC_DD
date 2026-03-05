const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id_venta",
      autoIncrement: true
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "fecha",
      autoIncrement: false
    },
    id_tipo_documento: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_tipo_documento",
      autoIncrement: false,
      references: {
        key: "id_tipo_documento",
        model: "tipo_documento_model"
      }
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_cliente",
      autoIncrement: false,
      references: {
        key: "id_cliente",
        model: "cliente_model"
      }
    },
    id_vendedor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_vendedor",
      autoIncrement: false,
      references: {
        key: "id_vendedor",
        model: "vendedor_model"
      }
    },
    id_canal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_canal",
      autoIncrement: false,
      references: {
        key: "id_canal",
        model: "canal_model"
      }
    },
    id_subcanal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "id_subcanal",
      autoIncrement: false,
      references: {
        key: "id_subcanal",
        model: "subcanal_model"
      }
    },
    precio_unitario_con_impuesto: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "precio_unitario_con_impuesto",
      autoIncrement: false
    },
    porcentaje_descuento: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "porcentaje_descuento",
      autoIncrement: false
    },
    porcentaje_impuesto: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "porcentaje_impuesto",
      autoIncrement: false
    },
    subtotal_total: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subtotal_total",
      autoIncrement: false
    },
    valor_descuentos: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_descuentos",
      autoIncrement: false
    },
    valor_impuestos: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_impuestos",
      autoIncrement: false
    },
    valor_neto: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_neto",
      autoIncrement: false
    },
    margen_promedio: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "margen_promedio",
      autoIncrement: false
    },
    impuesto_afecta_margen: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "impuesto_afecta_margen",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "venta",
    comment: "",
    indexes: []
  };
  const VentaModel = sequelize.define("venta_model", attributes, options);
  return VentaModel;
};