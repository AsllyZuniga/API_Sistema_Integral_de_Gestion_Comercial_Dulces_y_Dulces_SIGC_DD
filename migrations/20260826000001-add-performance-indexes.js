'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('proveedor', ['codigo'], {
      name: 'idx_proveedor_codigo',
    });

    await queryInterface.addIndex('venta', ['id_vendedor', 'fecha'], {
      name: 'idx_venta_vendedor_fecha',
    });

    await queryInterface.addIndex('detalle_venta', ['id_venta'], {
      name: 'idx_detalle_venta_venta',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('proveedor', 'idx_proveedor_codigo');
    await queryInterface.removeIndex('venta', 'idx_venta_vendedor_fecha');
    await queryInterface.removeIndex('detalle_venta', 'idx_detalle_venta_venta');
  },
};
