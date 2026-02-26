const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    linea: {
      type: DataTypes.CHAR(120),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "linea",
      autoIncrement: false
    },
    categoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "categoria",
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
    codigo_vendedor: {
      type: DataTypes.CHAR(20),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "codigo_vendedor",
      autoIncrement: false
    },
    nombre_vendedor: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nombre_vendedor",
      autoIncrement: false
    },
    nro_documento: {
      type: DataTypes.CHAR(40),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "nro_documento",
      autoIncrement: false
    },
    item: {
      type: DataTypes.CHAR(30),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "item",
      autoIncrement: false
    },
    desc_item: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "desc_item",
      autoIncrement: false
    },
    um_orden: {
      type: DataTypes.CHAR(20),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "um_orden",
      autoIncrement: false
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
    cliente_factura: {
      type: DataTypes.CHAR(30),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cliente_factura",
      autoIncrement: false
    },
    sucursal_factura: {
      type: DataTypes.CHAR(20),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sucursal_factura",
      autoIncrement: false
    },
    razon_social_cliente: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "razon_social_cliente",
      autoIncrement: false
    },
    direccion_1: {
      type: DataTypes.CHAR(200),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "direccion_1",
      autoIncrement: false
    },
    ciudad: {
      type: DataTypes.CHAR(120),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "ciudad",
      autoIncrement: false
    },
    cantidad_emp: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cantidad_emp",
      autoIncrement: false
    },
    cantidad: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cantidad",
      autoIncrement: false
    },
    costo_promedio_total: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "costo_promedio_total",
      autoIncrement: false
    },
    valor_bruto: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_bruto",
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
    valor_subtotal: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "valor_subtotal",
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
    },
    factor_um_emp: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "factor_um_emp",
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
    peso_kilo: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "peso_kilo",
      autoIncrement: false
    },
    barrio: {
      type: DataTypes.CHAR(120),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "barrio",
      autoIncrement: false
    },
    detalle_tipo_negocio: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "detalle_tipo_negocio",
      autoIncrement: false
    },
    cond_pago_fact: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "cond_pago_fact",
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
    tipo_negocio: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tipo_negocio",
      autoIncrement: false
    },
    subcanal: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subcanal",
      autoIncrement: false
    },
    subcanal_detallado: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subcanal_detallado",
      autoIncrement: false
    },
    megacategoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "megacategoria",
      autoIncrement: false
    },
    subcategoria: {
      type: DataTypes.CHAR(150),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "subcategoria",
      autoIncrement: false
    },
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    }
  };
  const options = {
    tableName: "staging_ventas",
    comment: "",
    indexes: [{
      name: "idx_staging_cliente_factura",
      unique: false,
      fields: ["cliente_factura"]
    }, {
      name: "idx_staging_item",
      unique: false,
      fields: ["item"]
    }, {
      name: "idx_staging_nro_documento",
      unique: false,
      fields: ["nro_documento"]
    }, {
      name: "idx_staging_vendedor",
      unique: false,
      fields: ["codigo_vendedor"]
    }]
  };
  const StagingVentasModel = sequelize.define("staging_ventas_model", attributes, options);
  return StagingVentasModel;
};