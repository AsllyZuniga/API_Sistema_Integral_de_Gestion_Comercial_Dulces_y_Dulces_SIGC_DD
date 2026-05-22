const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VendedorCuotaCategoria = sequelize.define('VendedorCuotaCategoria', {
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
            }
        },
        id_categoria: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'categoria',
                key: 'id_categoria'
            }
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
    }, {
        tableName: 'vendedor_cuota_categoria',
        schema: 'public',
        timestamps: false,
        indexes: [
            {
                unique: true,
                name: 'uq_vendedor_categoria_fechas',
                fields: ['id_vendedor', 'id_categoria', 'fecha_inicio', 'fecha_fin']
            }
        ]
    });

    VendedorCuotaCategoria.associate = (models) => {
        VendedorCuotaCategoria.belongsTo(models.Vendedor, {
            foreignKey: 'id_vendedor',
            as: 'vendedor'
        });
        VendedorCuotaCategoria.belongsTo(models.Categoria, {
            foreignKey: 'id_categoria',
            as: 'categoria'
        });
    };

    return VendedorCuotaCategoria;
};
