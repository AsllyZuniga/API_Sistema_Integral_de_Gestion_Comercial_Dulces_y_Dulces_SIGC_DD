/**
 * TABLA: vendedor_cuota_categoria
 * Vincula un vendedor con una categoría y su cuota para un período
 * 
 * Estructura:
 * - id (PK)
 * - id_vendedor (FK)
 * - id_categoria (FK)
 * - cuota (DECIMAL 15,2)
 * - fecha_inicio (DATE)
 * - fecha_fin (DATE)
 * 
 * Esta tabla permite guardar cuotas específicas por vendedor y categoría
 */

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('vendedor_cuota_categoria', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_vendedor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'vendedor',
          key: 'id_vendedor'
        },
        onDelete: 'CASCADE'
      },
      id_categoria: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'categoria',
          key: 'id_categoria'
        },
        onDelete: 'CASCADE'
      },
      cuota: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      fecha_inicio: {
        type: DataTypes.DATE,
        allowNull: true
      },
      fecha_fin: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // Crear índice único para evitar duplicados
    await queryInterface.addIndex('vendedor_cuota_categoria', 
      ['id_vendedor', 'id_categoria', 'fecha_inicio', 'fecha_fin'],
      {
        unique: true,
        name: 'uk_vendedor_categoria_periodo'
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vendedor_cuota_categoria');
  }
};
