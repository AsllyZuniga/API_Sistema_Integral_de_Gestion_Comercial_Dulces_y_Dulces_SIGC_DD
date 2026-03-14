'use strict';

/**
 * Migration: Agregar campos faltantes a la tabla 'venta'
 * 
 * Campos agregados:
 * - numero_documento: VARCHAR(50) - Número de referencia de la factura
 * - subtotal: DOUBLE - Subtotal antes de impuestos
 * 
 * Nota: valor_descuentos ya existe en el modelo, se verifica pero no se agrega
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Verificar si el campo numero_documento ya existe
      const table = await queryInterface.describeTable('venta');

      if (!table.numero_documento) {
        console.log('✅ Agregando campo numero_documento a tabla venta...');
        await queryInterface.addColumn('venta', 'numero_documento', {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Número de referencia de la factura (ej: FE1-00391434)'
        });
        console.log('✅ Campo numero_documento agregado correctamente');
      } else {
        console.log('⚠️  Campo numero_documento ya existe, omitiendo...');
      }

      if (!table.subtotal) {
        console.log('✅ Agregando campo subtotal a tabla venta...');
        await queryInterface.addColumn('venta', 'subtotal', {
          type: Sequelize.DOUBLE,
          allowNull: true,
          comment: 'Subtotal de la venta antes de impuestos'
        });
        console.log('✅ Campo subtotal agregado correctamente');
      } else {
        console.log('⚠️  Campo subtotal ya existe, omitiendo...');
      }

    } catch (error) {
      console.error('❌ Error en la migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const table = await queryInterface.describeTable('venta');

      if (table.numero_documento) {
        console.log('✅ Removiendo campo numero_documento...');
        await queryInterface.removeColumn('venta', 'numero_documento');
      }

      if (table.subtotal) {
        console.log('✅ Removiendo campo subtotal...');
        await queryInterface.removeColumn('venta', 'subtotal');
      }

    } catch (error) {
      console.error('❌ Error al revertir la migration:', error.message);
      throw error;
    }
  }
};
