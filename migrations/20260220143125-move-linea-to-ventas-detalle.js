'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Verificar si la columna linea ya existe en detalle_venta
      const table = await queryInterface.describeTable('detalle_venta');
      
      if (!table.linea) {
        console.log('✅ Agregando columna linea a detalle_venta...');
        await queryInterface.addColumn('detalle_venta', 'linea', {
          type: Sequelize.CHAR(120),
          allowNull: true,
          field: 'linea',
        });
      } else {
        console.log('⚠️  Columna linea ya existe en detalle_venta, omitiendo addColumn...');
      }

      // Verificar si la columna linea existe en venta antes de removerla
      const ventaTable = await queryInterface.describeTable('venta');
      if (ventaTable.linea) {
        console.log('✅ Removiendo columna linea de venta...');
        await queryInterface.removeColumn('venta', 'linea');
      } else {
        console.log('⚠️  Columna linea no existe en venta, omitiendo removeColumn...');
      }

    } catch (error) {
      console.error('Error en migration:', error.message);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      const ventaTable = await queryInterface.describeTable('venta');
      if (!ventaTable.linea) {
        console.log('✅ Agregando columna linea a venta...');
        await queryInterface.addColumn('venta', 'linea', {
          type: Sequelize.CHAR(120),
          allowNull: true,
          field: 'linea',
        });
      }

      const detalleTable = await queryInterface.describeTable('detalle_venta');
      if (detalleTable.linea) {
        console.log('✅ Removiendo columna linea de detalle_venta...');
        await queryInterface.removeColumn('detalle_venta', 'linea');
      }

    } catch (error) {
      console.error('Error al revertir migration:', error.message);
      throw error;
    }
  }
};