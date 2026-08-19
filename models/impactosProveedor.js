const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ImpactosProveedor = sequelize.define('ImpactosProveedor', {
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
        id_proveedor: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'proveedor',
                key: 'id_proveedor'
            }
        },
        tipo_periodo: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        fecha_inicio: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        fecha_fin: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        cuota: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'impactos_proveedor',
        schema: 'public',
        timestamps: false,
        indexes: [
            {
                unique: true,
                name: 'uk_impactos_proveedor_periodo',
                fields: ['id_vendedor', 'id_proveedor', 'fecha_inicio', 'fecha_fin']
            }
        ]
    });

    return ImpactosProveedor;
};