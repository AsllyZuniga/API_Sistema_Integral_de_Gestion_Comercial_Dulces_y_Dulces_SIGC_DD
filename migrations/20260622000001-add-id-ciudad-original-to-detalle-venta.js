'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn('detalle_venta', 'id_ciudad_original', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { key: 'id_ciudad', model: 'ciudad' }
            }, { transaction });

            await queryInterface.addIndex('detalle_venta', ['id_ciudad_original'], { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeIndex('detalle_venta', ['id_ciudad_original'], { transaction });
            await queryInterface.removeColumn('detalle_venta', 'id_ciudad_original', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
