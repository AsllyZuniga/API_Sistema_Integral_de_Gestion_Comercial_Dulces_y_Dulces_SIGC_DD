'use strict';

/**
 * TABLAS: impactos_cliente, impactos_categoria, impactos_proveedor
 *
 * Guardan cuotas de impacto por vendedor para un período:
 * - impactos_cliente    → vendedor + período + cuota
 * - impactos_categoria  → vendedor + categoría + período + cuota
 * - impactos_proveedor  → vendedor + proveedor + período + cuota
 *
 * SOLO EN ENTORNO DE PRUEBAS (Neon). NUNCA correr contra producción.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.createTable('impactos_cliente', {
                id: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                id_vendedor: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'vendedor',
                        key: 'id_vendedor'
                    },
                    onDelete: 'CASCADE'
                },
                tipo_periodo: {
                    type: Sequelize.STRING(20),
                    allowNull: false
                },
                fecha_inicio: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                fecha_fin: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                cuota: {
                    type: Sequelize.DECIMAL(15, 2),
                    allowNull: false,
                    defaultValue: 0
                }
            }, { transaction });

            await queryInterface.addIndex('impactos_cliente',
                ['id_vendedor', 'fecha_inicio', 'fecha_fin'],
                { unique: true, name: 'uk_impactos_cliente_periodo', transaction });

            await queryInterface.createTable('impactos_categoria', {
                id: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                id_vendedor: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'vendedor',
                        key: 'id_vendedor'
                    },
                    onDelete: 'CASCADE'
                },
                id_categoria: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'categoria',
                        key: 'id_categoria'
                    },
                    onDelete: 'CASCADE'
                },
                tipo_periodo: {
                    type: Sequelize.STRING(20),
                    allowNull: false
                },
                fecha_inicio: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                fecha_fin: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                cuota: {
                    type: Sequelize.DECIMAL(15, 2),
                    allowNull: false,
                    defaultValue: 0
                }
            }, { transaction });

            await queryInterface.addIndex('impactos_categoria',
                ['id_vendedor', 'id_categoria', 'fecha_inicio', 'fecha_fin'],
                { unique: true, name: 'uk_impactos_categoria_periodo', transaction });

            await queryInterface.createTable('impactos_proveedor', {
                id: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                id_vendedor: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'vendedor',
                        key: 'id_vendedor'
                    },
                    onDelete: 'CASCADE'
                },
                id_proveedor: {
                    type: Sequelize.BIGINT,
                    allowNull: false,
                    references: {
                        model: 'proveedor',
                        key: 'id_proveedor'
                    },
                    onDelete: 'CASCADE'
                },
                tipo_periodo: {
                    type: Sequelize.STRING(20),
                    allowNull: false
                },
                fecha_inicio: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                fecha_fin: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                cuota: {
                    type: Sequelize.DECIMAL(15, 2),
                    allowNull: false,
                    defaultValue: 0
                }
            }, { transaction });

            await queryInterface.addIndex('impactos_proveedor',
                ['id_vendedor', 'id_proveedor', 'fecha_inicio', 'fecha_fin'],
                { unique: true, name: 'uk_impactos_proveedor_periodo', transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.dropTable('impactos_cliente', { transaction });
            await queryInterface.dropTable('impactos_categoria', { transaction });
            await queryInterface.dropTable('impactos_proveedor', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};