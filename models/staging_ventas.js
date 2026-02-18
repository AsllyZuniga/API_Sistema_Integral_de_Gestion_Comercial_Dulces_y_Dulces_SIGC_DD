const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StagingVentasTxtModel = sequelize.define(
    "staging_ventas_model",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      linea: DataTypes.STRING(120),
      categoria: DataTypes.STRING(150),
      canal: DataTypes.STRING(120),
      codigo_vendedor: DataTypes.STRING(20),
      nombre_vendedor: DataTypes.STRING(150),
      nro_documento: DataTypes.STRING(40),
      item: DataTypes.STRING(30),
      desc_item: DataTypes.STRING(200),
      um_orden: DataTypes.STRING(20),
      fecha: DataTypes.DATEONLY,
      cliente_factura: DataTypes.STRING(30),
      sucursal_factura: DataTypes.STRING(20),
      razon_social_cliente: DataTypes.STRING(200),
      direccion_1: DataTypes.STRING(200),
      ciudad: DataTypes.STRING(120),

      cantidad_emp: DataTypes.DECIMAL(14, 4),
      cantidad: DataTypes.DECIMAL(14, 4),
      costo_promedio_total: DataTypes.DECIMAL(14, 2),
      valor_bruto: DataTypes.DECIMAL(14, 2),
      valor_descuentos: DataTypes.DECIMAL(14, 2),
      valor_subtotal: DataTypes.DECIMAL(14, 2),
      valor_impuestos: DataTypes.DECIMAL(14, 2),
      valor_neto: DataTypes.DECIMAL(14, 2),
      margen_promedio: DataTypes.DECIMAL(10, 4),
      impuesto_afecta_margen: DataTypes.DECIMAL(14, 2),
      factor_um_emp: DataTypes.DECIMAL(14, 6),
      factor_um_orden: DataTypes.DECIMAL(14, 6),
      peso_kilo: DataTypes.DECIMAL(14, 4),

      barrio: DataTypes.STRING(120),
      detalle_tipo_negocio: DataTypes.STRING(150),
      cond_pago_fact: DataTypes.STRING(50),
      nombre_establecimiento: DataTypes.STRING(200),
      tipo_negocio: DataTypes.STRING(150),
      subcanal: DataTypes.STRING(150),
      subcanal_detallado: DataTypes.STRING(150),
      megacategoria: DataTypes.STRING(150),
      subcategoria: DataTypes.STRING(150),
    },
    {
      tableName: "staging_ventas",
      schema: "public",
      timestamps: false,
      freezeTableName: true,
      underscored: true,
      indexes: [
        {
          name: "idx_staging_cliente_factura",
          fields: ["cliente_factura"],
        },
        {
          name: "idx_staging_item",
          fields: ["item"],
        },
        {
          name: "idx_staging_nro_documento",
          fields: ["nro_documento"],
        },
        {
          name: "idx_staging_vendedor",
          fields: ["codigo_vendedor"],
        },
      ],
    }
  );

  return StagingVentasTxtModel;
};
