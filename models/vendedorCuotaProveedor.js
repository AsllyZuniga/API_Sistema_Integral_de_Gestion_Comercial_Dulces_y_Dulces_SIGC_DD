const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VendedorCuotaProveedor = sequelize.define('VendedorCuotaProveedor', {
        id_vendedor_cuota_proveedor: {
            type: DataTypes.INTEGER,
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
        id_cuotaProveedor: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'cuotaProveedor',
                key: 'id_cuotaProveedor'
            }
        },
        estado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'vendedorCuotaProveedor',
        schema: 'public',
        timestamps: false,
        indexes: [
            {
                unique: true,
                name: 'uq_vendedor_proveedor_cuota',
                fields: ['id_vendedor', 'id_proveedor', 'id_cuotaProveedor']
            }
        ]
    });

    VendedorCuotaProveedor.associate = (models) => {
        VendedorCuotaProveedor.belongsTo(models.Vendedor, {
            foreignKey: 'id_vendedor',
            as: 'vendedor'
        });
        VendedorCuotaProveedor.belongsTo(models.Proveedor, {
            foreignKey: 'id_proveedor',
            as: 'proveedor'
        });
        VendedorCuotaProveedor.belongsTo(models.CuotaProveedor, {
            foreignKey: 'id_cuotaProveedor',
            as: 'cuotaProveedor'
        });
    };

    return VendedorCuotaProveedor;
};