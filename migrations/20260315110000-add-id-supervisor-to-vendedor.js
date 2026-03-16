'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('vendedor');

    if (!tableDefinition.id_supervisor) {
      await queryInterface.addColumn('vendedor', 'id_supervisor', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      WHERE con.contype = 'f' AND src.relname = 'vendedor';
    `);

    const constraintName = 'vendedor_id_supervisor_fkey';
    const existeFk = constraints.some((c) => c.constraint_name === constraintName);

    if (!existeFk) {
      await queryInterface.addConstraint('vendedor', {
        fields: ['id_supervisor'],
        type: 'foreign key',
        name: constraintName,
        references: {
          table: 'usuario',
          field: 'id_usuario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      WHERE con.contype = 'f' AND src.relname = 'vendedor';
    `);

    const constraintName = 'vendedor_id_supervisor_fkey';
    const existeFk = constraints.some((c) => c.constraint_name === constraintName);

    if (existeFk) {
      await queryInterface.removeConstraint('vendedor', constraintName);
    }

    const tableDefinition = await queryInterface.describeTable('vendedor');
    if (tableDefinition.id_supervisor) {
      await queryInterface.removeColumn('vendedor', 'id_supervisor');
    }
  }
};