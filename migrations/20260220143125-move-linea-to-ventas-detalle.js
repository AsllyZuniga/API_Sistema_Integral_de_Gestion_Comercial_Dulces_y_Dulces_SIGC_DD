'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ventas_detalle', 'linea', {
      type: Sequelize.CHAR(120),
      allowNull: true,
      field: 'linea',
    });
    await queryInterface.removeColumn('ventas', 'linea');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('ventas', 'linea', {
      type: Sequelize.CHAR(120),
      allowNull: true,
      field: 'linea',
    });
    await queryInterface.removeColumn('ventas_detalle', 'linea');
  }
};