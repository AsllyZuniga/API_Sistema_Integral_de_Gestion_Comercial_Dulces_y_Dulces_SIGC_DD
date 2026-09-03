'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('cliente', ['nro_documento', 'sucursal'], {
      name: 'idx_cliente_nro_documento_sucursal',
    });

    await queryInterface.addIndex('categoria', ['nombre'], {
      name: 'idx_categoria_nombre',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('cliente', 'idx_cliente_nro_documento_sucursal');
    await queryInterface.removeIndex('categoria', 'idx_categoria_nombre');
  },
};
