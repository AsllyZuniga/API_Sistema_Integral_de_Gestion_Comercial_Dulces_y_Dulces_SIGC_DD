const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ImpactosCliente = sequelize.define('ImpactosCliente', {
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
        tableName: 'impactos_cliente',
        schema: 'public',
        timestamps: false,
        indexes: [
            {
                unique: true,
                name: 'uk_impactos_cliente_periodo',
                fields: ['id_vendedor', 'fecha_inicio', 'fecha_fin']
            }
        ]
    });

    return ImpactosCliente;
};