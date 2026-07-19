'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn('usuario', 'acceso_ventas', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            }, { transaction });

            await queryInterface.addColumn('usuario', 'acceso_cuotas', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            }, { transaction });

            await queryInterface.addColumn('usuario', 'acceso_gestion_usuarios', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('usuario', 'acceso_gestion_usuarios', { transaction });
            await queryInterface.removeColumn('usuario', 'acceso_cuotas', { transaction });
            await queryInterface.removeColumn('usuario', 'acceso_ventas', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
