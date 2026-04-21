'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'vendedorCuotaProveedor';
    const fkName = 'vendedorCuotaProveedor_id_proveedor_fkey';

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      WHERE con.contype = 'f' AND src.relname = '${tableName}';
    `);

    const existeFk = constraints.some((c) => c.constraint_name === fkName);
    if (existeFk) {
      await queryInterface.removeConstraint(tableName, fkName);
    }

    await queryInterface.changeColumn(tableName, 'id_proveedor', {
      type: Sequelize.BIGINT,
      allowNull: false
    });

    await queryInterface.addConstraint(tableName, {
      fields: ['id_proveedor'],
      type: 'foreign key',
      name: fkName,
      references: {
        table: 'proveedor',
        field: 'id_proveedor'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = 'vendedorCuotaProveedor';
    const fkName = 'vendedorCuotaProveedor_id_proveedor_fkey';

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      WHERE con.contype = 'f' AND src.relname = '${tableName}';
    `);

    const existeFk = constraints.some((c) => c.constraint_name === fkName);
    if (existeFk) {
      await queryInterface.removeConstraint(tableName, fkName);
    }

    await queryInterface.changeColumn(tableName, 'id_proveedor', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.addConstraint(tableName, {
      fields: ['id_proveedor'],
      type: 'foreign key',
      name: fkName,
      references: {
        table: 'proveedor',
        field: 'id_proveedor'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  }
};
