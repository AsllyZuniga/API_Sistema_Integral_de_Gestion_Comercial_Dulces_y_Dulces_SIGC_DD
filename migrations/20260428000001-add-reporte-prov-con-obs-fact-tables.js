'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('=== Iniciando migración: agregar reporte_prov_con_obs y tablas fact ===');

      // 1. Agregar columna reporte_prov_con_obs a detalle_venta
      console.log('✅ Agregando columna reporte_prov_con_obs a detalle_venta...');
      const dvTable = await queryInterface.describeTable('detalle_venta');
      if (!dvTable.reporte_prov_con_obs) {
        await queryInterface.addColumn(
          'detalle_venta',
          'reporte_prov_con_obs',
          {
            type: Sequelize.STRING(200),
            allowNull: true,
            comment: 'Reporte proveedor con observación (del TSV REPORTE PROV CON OBS)'
          },
          { transaction }
        );
        console.log('✅ Columna reporte_prov_con_obs agregada a detalle_venta');
      } else {
        console.log('⚠️ Columna reporte_prov_con_obs ya existe, omitiendo...');
      }

      // 2. Crear tabla fact_ventas
      console.log('✅ Creando tabla fact_ventas...');
      await queryInterface.createTable(
        'fact_ventas',
        {
          id_fact: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          id_venta: {
            type: Sequelize.INTEGER,
            references: { model: 'venta', key: 'id_venta' },
            allowNull: false
          },
          id_detalle: {
            type: Sequelize.INTEGER,
            references: { model: 'detalle_venta', key: 'id_detalle' },
            allowNull: true
          },
          // snapshot vendedor
          codigo_vendedor: { type: Sequelize.STRING(50), allowNull: true },
          nombre_vendedor: { type: Sequelize.STRING(200), allowNull: true },
          // snapshot cliente
          cliente_factura: { type: Sequelize.STRING(50), allowNull: true },
          razon_social_cliente: { type: Sequelize.STRING(200), allowNull: true },
          // snapshot item
          item: { type: Sequelize.STRING(50), allowNull: true },
          desc_item: { type: Sequelize.STRING(200), allowNull: true },
          // dimensiones
          linea: { type: Sequelize.STRING(200), allowNull: true },
          reporte_prov_con_obs: { type: Sequelize.STRING(200), allowNull: true },
          canal: { type: Sequelize.STRING(200), allowNull: true },
          categoria: { type: Sequelize.STRING(200), allowNull: true },
          subcanal: { type: Sequelize.STRING(200), allowNull: true },
          subcanal_detallado: { type: Sequelize.STRING(200), allowNull: true },
          megacategoria: { type: Sequelize.STRING(200), allowNull: true },
          subcategoria: { type: Sequelize.STRING(200), allowNull: true },
          tipo_negocio: { type: Sequelize.STRING(200), allowNull: true },
          ciudad: { type: Sequelize.STRING(200), allowNull: true },
          barrio: { type: Sequelize.STRING(200), allowNull: true },
          // métricas
          fecha: { type: Sequelize.DATEONLY, allowNull: true },
          cantidades: { type: Sequelize.DOUBLE, allowNull: true },
          valores: { type: Sequelize.DOUBLE, allowNull: true },
          margen: { type: Sequelize.DOUBLE, allowNull: true },
          impuestos: { type: Sequelize.DOUBLE, allowNull: true }
        },
        { transaction }
      );
      console.log('✅ Tabla fact_ventas creada');

      // 3. Crear tabla cliente_vendedor
      console.log('✅ Creando tabla cliente_vendedor...');
      await queryInterface.createTable(
        'cliente_vendedor',
        {
          id_cliente_vendedor: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          cliente_factura: {
            type: Sequelize.STRING(50),
            allowNull: false
          },
          codigo_vendedor: {
            type: Sequelize.STRING(50),
            allowNull: false
          },
          fecha_desde: { type: Sequelize.DATEONLY, allowNull: true },
          fecha_hasta: { type: Sequelize.DATEONLY, allowNull: true },
          activo: { type: Sequelize.BOOLEAN, defaultValue: true }
        },
        { transaction }
      );

      // Crear índice único para evitar duplicados
      await queryInterface.addIndex(
        'cliente_vendedor',
        ['cliente_factura', 'codigo_vendedor'],
        { unique: true, transaction }
      );
      console.log('✅ Tabla cliente_vendedor creada');

      // 4. Poblar fact_ventas desde datos existentes
      console.log('✅ Poblando fact_ventas desde datos existentes...');
      const insertFactQuery = `
        INSERT INTO fact_ventas (
          id_venta, id_detalle,
          codigo_vendedor, nombre_vendedor,
          cliente_factura, razon_social_cliente,
          item, desc_item,
          linea, reporte_prov_con_obs,
          fecha, cantidades, valores, margen, impuestos
        )
        SELECT
          v.id_venta, dv.id_detalle,
          vd.codigo_vendedor, vd.codigo_vendedor,
          cl.nro_documento, cl.razon_social,
          it.codigo_item, it.descripcion,
          COALESCE(pr.nombre, 'SIN LINEA') AS linea,
          COALESCE(dv.reporte_prov_con_obs, pr.nombre, 'SIN LINEA') AS reporte_prov_con_obs,
          v.fecha, dv.cantidad, dv.subtotal, v.margen_promedio, v.valor_impuestos
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN detalle_venta dv ON dv.id_venta = v.id_venta
        JOIN item it ON it.id_item = dv.id_item
        LEFT JOIN proveedor pr ON pr.id_proveedor = it.id_proveedor
        LEFT JOIN cliente cl ON cl.id_cliente = v.id_cliente
      `;
      await queryInterface.sequelize.query(insertFactQuery, { transaction });
      console.log('✅ fact_ventas poblada');

      // 5. Poblar cliente_vendedor desde historial
      console.log('✅ Poblando cliente_vendedor desde historial...');
      const insertClienteVendedorQuery = `
        INSERT INTO cliente_vendedor (cliente_factura, codigo_vendedor, fecha_desde, activo)
        SELECT DISTINCT
          cl.nro_documento,
          vd.codigo_vendedor,
          MIN(v.fecha) AS fecha_desde,
          true
        FROM venta v
        JOIN vendedor vd ON vd.id_vendedor = v.id_vendedor
        JOIN cliente cl ON cl.id_cliente = v.id_cliente
        GROUP BY cl.nro_documento, vd.codigo_vendedor
        ON CONFLICT DO NOTHING
      `;
      await queryInterface.sequelize.query(insertClienteVendedorQuery, { transaction });
      console.log('✅ cliente_vendedor poblada');

      // 6. Crear vista de compatibilidad
      console.log('✅ Creando vista vw_ventas_reporte...');
      const createViewQuery = `
        CREATE OR REPLACE VIEW vw_ventas_reporte AS
        SELECT
          *,
          reporte_prov_con_obs AS linea_reporte
        FROM fact_ventas
      `;
      await queryInterface.sequelize.query(createViewQuery, { transaction });
      console.log('✅ Vista vw_ventas_reporte creada');

      await transaction.commit();
      console.log('=== ✅ Migración completada exitosamente ===');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en la migración:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('=== Revirtiendo migración ===');

      // 1. Eliminar vista
      console.log('✅ Eliminando vista vw_ventas_reporte...');
      await queryInterface.sequelize.query('DROP VIEW IF EXISTS vw_ventas_reporte CASCADE', { transaction });

      // 2. Eliminar tablas
      console.log('✅ Eliminando tabla cliente_vendedor...');
      await queryInterface.dropTable('cliente_vendedor', { transaction });

      console.log('✅ Eliminando tabla fact_ventas...');
      await queryInterface.dropTable('fact_ventas', { transaction });

      // 3. Eliminar columna de detalle_venta
      console.log('✅ Eliminando columna reporte_prov_con_obs de detalle_venta...');
      const dvTable = await queryInterface.describeTable('detalle_venta');
      if (dvTable.reporte_prov_con_obs) {
        await queryInterface.removeColumn('detalle_venta', 'reporte_prov_con_obs', { transaction });
      }

      await transaction.commit();
      console.log('=== ✅ Migración revertida exitosamente ===');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al revertir la migración:', error.message);
      throw error;
    }
  }
};
