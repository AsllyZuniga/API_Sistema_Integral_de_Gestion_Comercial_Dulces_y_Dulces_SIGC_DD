'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    const [constraints] = await sequelize.query(`
      SELECT
        con.conname AS constraint_name,
        src_att.attname AS source_column,
        tgt.relname AS target_table,
        tgt_att.attname AS target_column
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_class tgt ON tgt.oid = con.confrelid
      JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
      JOIN pg_attribute src_att ON src_att.attrelid = src.oid AND src_att.attnum = u.attnum
      JOIN unnest(con.confkey) WITH ORDINALITY AS fu(attnum, ord) ON fu.ord = u.ord
      JOIN pg_attribute tgt_att ON tgt_att.attrelid = tgt.oid AND tgt_att.attnum = fu.attnum
      WHERE con.contype = 'f' AND src.relname = 'cliente'
      ORDER BY con.conname;
    `);

    const fkRota = constraints.find(c => c.constraint_name === 'cliente_id_tipo_negocio_fkey');

    if (fkRota) {
      await queryInterface.removeConstraint('cliente', 'cliente_id_tipo_negocio_fkey');
      console.log('✅ Constraint rota cliente_id_tipo_negocio_fkey eliminada');
    }

    const existeCorrecta = constraints.some(c =>
      c.source_column === 'id_tipo_negocio' &&
      c.target_table === 'tipo_negocio' &&
      c.target_column === 'id_tipo_negocio'
    );

    if (!existeCorrecta) {
      await queryInterface.addConstraint('cliente', {
        fields: ['id_tipo_negocio'],
        type: 'foreign key',
        name: 'cliente_id_tipo_negocio_fkey',
        references: {
          table: 'tipo_negocio',
          field: 'id_tipo_negocio'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ Constraint correcta cliente.id_tipo_negocio -> tipo_negocio.id_tipo_negocio creada');
    }
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    const [constraints] = await sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      WHERE con.contype = 'f' AND src.relname = 'cliente';
    `);

    const existe = constraints.some(c => c.constraint_name === 'cliente_id_tipo_negocio_fkey');
    if (existe) {
      await queryInterface.removeConstraint('cliente', 'cliente_id_tipo_negocio_fkey');
    }

    await queryInterface.addConstraint('cliente', {
      fields: ['id_canal'],
      type: 'foreign key',
      name: 'cliente_id_tipo_negocio_fkey',
      references: {
        table: 'tipo_negocio',
        field: 'id_tipo_negocio'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
